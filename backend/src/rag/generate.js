// import { getGroqClient } from "../services/groq.js";

// export const generateAnswer = async (context, question) => {
//   const client = getGroqClient();

//   const res = await client.chat.completions.create({
//     model: "llama-3.1-8b-instant",
//     messages: [
//       {
//         role: "system",
//         content: `
// You are a strict document QA assistant.

// RULES:
// - Answer ONLY using the provided context
// - Do NOT ask for more context
// - Do NOT behave like a chatbot
// - If answer not found, say: "I don't know"
// - Be concise and factual
//         `,
//       },
//       {
//         role: "user",
//         content: `
// Context:
// ${context}

// Question:
// ${question}

// Answer:
//         `,
//       },
//     ],
//   });

//   return res.choices[0].message.content;
// };
// backend/src/rag/generate.js
// Upgraded: HYDE, sub-query decomposition, LLM judge, corrective RAG

import Groq from 'groq-sdk';
import { getEmbedding } from './embed.js';
import { retrieve, retrieveByEmbedding } from './retriever.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── 1. Query Rewriting ────────────────────────────────────────────────────────
export async function rewriteQuery(originalQuestion) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Rewrite the following user question into a clearer, more specific search query
that would help retrieve relevant passages from a document.
Return ONLY the rewritten query, nothing else.

Original question: "${originalQuestion}"`,
    }],
    temperature: 0.3,
    max_tokens: 100,
  });
  return res.choices[0].message.content.trim();
}

// ── 2. Sub-query Decomposition ────────────────────────────────────────────────
export async function decomposeQuery(question) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Break the following complex question into 2-3 simpler sub-questions
that together would answer it. Return ONLY a JSON array of strings.
Example: ["What is X?", "How does Y work?", "Why does Z happen?"]

Question: "${question}"`,
    }],
    temperature: 0.3,
    max_tokens: 200,
  });

  try {
    const raw = res.choices[0].message.content.trim();
    const parsed = JSON.parse(raw.match(/\[[\s\S]*?\]/)[0]);
    return Array.isArray(parsed) ? parsed : [question];
  } catch {
    return [question];
  }
}

// ── 3. HyDE ───────────────────────────────────────────────────────────────────
export async function generateHypotheticalAnswer(question) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'system',
      content: 'Write a short hypothetical document passage (2-3 sentences) that would perfectly answer the question. Be factual and specific.',
    }, {
      role: 'user',
      content: question,
    }],
    temperature: 0.5,
    max_tokens: 150,
  });
  return res.choices[0].message.content.trim();
}

// ── 4. LLM Judge ─────────────────────────────────────────────────────────────
async function judgeAnswer(question, context, answer) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `You are an impartial judge evaluating a RAG system answer.

Question: "${question}"
Context used: "${context.slice(0, 800)}"
Answer given: "${answer}"

Rate the answer on:
1. Faithfulness (0-10): Is every claim supported by the context?
2. Relevance (0-10): Does it answer the question?

Reply ONLY with JSON: {"faithfulness": N, "relevance": N, "issues": "brief note or null"}`,
    }],
    temperature: 0,
    max_tokens: 150,
  });

  try {
    const raw = res.choices[0].message.content.trim();
    return JSON.parse(raw.match(/\{[\s\S]*?\}/)[0]);
  } catch {
    return { faithfulness: 5, relevance: 5, issues: null };
  }
}

// ── 5. Main generate ──────────────────────────────────────────────────────────
export async function generateAnswer(question, docId) {
  // A: Rewrite query
  const rewrittenQuery = await rewriteQuery(question);

  // B: Sub-query decomposition
  const subQueries = await decomposeQuery(rewrittenQuery);

  // C: HyDE — generate hypothetical answer, embed it, retrieve with that vector
  const hypotheticalDoc = await generateHypotheticalAnswer(rewrittenQuery);
  const hydeEmbedding = await getEmbedding(hypotheticalDoc);

  // D: Retrieve for each sub-query + HyDE in parallel
  const [hydeChunks, ...subQueryChunks] = await Promise.all([
    retrieveByEmbedding(hydeEmbedding, docId, 5),
    ...subQueries.map(q => retrieve(q, docId, 5)),
  ]);

  // E: Merge + deduplicate by text prefix
  const allRetrieved = [hydeChunks, ...subQueryChunks].flat();
  const seen = new Set();
  const uniqueChunks = allRetrieved.filter(c => {
    const key = c.text.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // F: Sort by best score, respect token budget (~6000 chars)
  const TOKEN_BUDGET_CHARS = 6000;
  const sorted = uniqueChunks
    .sort((a, b) => (b.rerankScore ?? b.score ?? 0) - (a.rerankScore ?? a.score ?? 0));

  let contextText = '';
  const usedChunks = [];
  for (const chunk of sorted) {
    if (contextText.length + chunk.text.length > TOKEN_BUDGET_CHARS) break;
    contextText += chunk.text + '\n\n';
    usedChunks.push(chunk);
  }

  // G: Generate answer
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are a precise document assistant. Answer questions STRICTLY based on
the provided context. If the context doesn't contain enough information, say so clearly.
Do not use any external knowledge. Be concise and cite specific parts of the context.`,
      },
      {
        role: 'user',
        content: `Context from document:\n${contextText}\n\nQuestion: ${question}\n\nAnswer:`,
      },
    ],
    temperature: 0.2,
    max_tokens: 600,
  });

  const answer = res.choices[0].message.content.trim();

  // H: LLM Judge
  const judgment = await judgeAnswer(question, contextText, answer);

  // I: Corrective RAG — regenerate if faithfulness is low
  let finalAnswer = answer;
  if (judgment.faithfulness < 5) {
    const correction = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `The previous answer had low faithfulness (score: ${judgment.faithfulness}/10).
Issue: ${judgment.issues}
Rewrite using ONLY information explicitly stated in the context.
If insufficient, say "The document does not contain enough information to answer this."`,
        },
        {
          role: 'user',
          content: `Context:\n${contextText}\n\nQuestion: ${question}\n\nCorrected Answer:`,
        },
      ],
      temperature: 0,
      max_tokens: 600,
    });
    finalAnswer = correction.choices[0].message.content.trim();
  }

  return {
    answer: finalAnswer,
    sources: usedChunks.map(c => ({
      text: c.text.slice(0, 300),
      type: c.type,
      score: c.rerankScore ?? c.score ?? 0,
    })),
    meta: {
      rewrittenQuery,
      subQueries,
      judgment,
      corrected: judgment.faithfulness < 5,
      chunksUsed: usedChunks.length,
    },
  };
}