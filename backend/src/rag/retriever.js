import { vectorStore } from "./store.js";

const cosine = (a, b) => {
  if (!a || !b) return 0;

  let dot = 0,
    magA = 0,
    magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

export const retrieveTopK = (queryEmbedding, docId, k = 5) => {
  const pool = vectorStore.filter((x) => x.docId === docId);

  console.log("TOTAL DOC CHUNKS:", pool.length);

  const scored = pool.map((item) => ({
    ...item,
    score: cosine(queryEmbedding, item.embedding),
  }));

  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  console.log("TOP SCORES:", sorted.map((x) => x.score));
   console.log("QUERY DOCID:", docId);
  console.log("VECTOR DOC IDS:", [...new Set(vectorStore.map(v => v.docId))]);
  return sorted;
};