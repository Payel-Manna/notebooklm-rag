// import { client } from "./store.js";

// const COLLECTION = "documents";

// export const retrieveTopK = async (queryEmbedding, docId, k = 5) => {
//   const results = await client.search(COLLECTION, {
//     vector: queryEmbedding,
//     limit: k,
//     filter: {
//       must: [{ key: "docId", match: { value: docId } }],
//     },
//     with_payload: true,
//   });

//   console.log("TOP SCORES:", results.map((r) => r.score));
//   console.log("QUERY DOCID:", docId);
//   console.log("SEARCHING DOCID:", docId);
//   return results.map((r) => ({
//     text: r.payload.text,
//     type: r.payload.type,
//     score: r.score,
//   }));
// };
// backend/src/rag/retriever.js
// Upgraded: cosine retrieval + cross-encoder-style re-ranking via Groq

import { getEmbedding } from './embed.js';
import { vectorStore } from './store.js';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

export async function retrieve(question, docId, topK = 10) {
  const queryVec = await getEmbedding(question);
  const allChunks = vectorStore.getByDocId(docId);

  // Step 1: Initial cosine similarity retrieval (get top 20 candidates)
  const scored = allChunks
    .map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryVec, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(20, allChunks.length));

  // Step 2: Cross-encoder re-ranking via LLM
  const reranked = await crossEncoderRerank(question, scored, topK);
  return reranked;
}

async function crossEncoderRerank(question, candidates, topK) {
  if (candidates.length <= topK) return candidates;

  // Build a compact prompt for the LLM to score relevance
  const items = candidates
    .slice(0, 15)
    .map((c, i) => `[${i}] ${c.text.slice(0, 200)}`)
    .join('\n\n');

  const prompt = `You are a relevance scoring engine.
Question: "${question}"

Rate each passage's relevance to the question on a scale 0-10. 
Reply ONLY with a JSON array of numbers, one per passage, in order.
Example: [8, 3, 7, 1, 9, ...]

Passages:
${items}`;

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 200,
    });

    const raw = res.choices[0].message.content.trim();
    const scores = JSON.parse(raw.match(/\[[\d\s,\.]+\]/)[0]);

    return candidates
      .slice(0, scores.length)
      .map((c, i) => ({ ...c, rerankScore: scores[i] ?? 0 }))
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, topK);
  } catch {
    // Fallback to cosine order if reranking fails
    return candidates.slice(0, topK);
  }
}