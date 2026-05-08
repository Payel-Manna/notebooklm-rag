import { client } from "./store.js";

const COLLECTION = "documents";

export const retrieveTopK = async (queryEmbedding, docId, k = 5) => {
  const results = await client.search(COLLECTION, {
    vector: queryEmbedding,
    limit: k,
    filter: {
      must: [{ key: "docId", match: { value: docId } }],
    },
    with_payload: true,
  });

  console.log("TOP SCORES:", results.map((r) => r.score));
  console.log("QUERY DOCID:", docId);
  console.log("SEARCHING DOCID:", docId);
  return results.map((r) => ({
    text: r.payload.text,
    type: r.payload.type,
    score: r.score,
  }));
};