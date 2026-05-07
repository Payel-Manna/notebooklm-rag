import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = "documents";
const VECTOR_SIZE = 384;

export const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export const initStore = async () => {
  const existing = await client.getCollections();
  const exists = existing.collections.some((c) => c.name === COLLECTION);

  if (exists) {
    await client.deleteCollection(COLLECTION);
    console.log("Deleted old collection");
  }

  await client.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
  });

  await client.createPayloadIndex(COLLECTION, {
    field_name: "docId",
    field_schema: "keyword",
  });

  console.log("Qdrant collection and index created fresh");
};

export const addChunks = async (chunks, embeddings, docId, type) => {
  const points = chunks.map((chunk, i) => ({
    id: Math.floor(Math.random() * 1_000_000_000),
    vector: embeddings[i],
    payload: { text: chunk, docId, type },
  }));

  await client.upsert(COLLECTION, { points });
  console.log(`Stored ${points.length} chunks in Qdrant`);
};

export const clearStore = async (docId) => {
  await client.delete(COLLECTION, {
    filter: {
      must: [{ key: "docId", match: { value: docId } }],
    },
  });
  console.log(`Cleared chunks for docId: ${docId}`);
};