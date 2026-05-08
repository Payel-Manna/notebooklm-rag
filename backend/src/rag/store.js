import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "crypto";

const COLLECTION = "documents";
const VECTOR_SIZE = 384;

export const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  timeout: 120000,
});

export const initStore = async () => {
  const existing = await client.getCollections();

  const exists = existing.collections.some(
    (c) => c.name === COLLECTION
  );

  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });

    await client.createPayloadIndex(COLLECTION, {
      field_name: "docId",
      field_schema: "keyword",
    });

    console.log("Qdrant collection created");
  } else {
    console.log("Qdrant collection already exists");
  }
};

export const addChunks = async (
  chunks,
  embeddings,
  docId,
  type
) => {
  const points = chunks.map((chunk, i) => ({
    id: crypto.randomUUID(),
    vector: embeddings[i],
    payload: {
      text: chunk,
      docId,
      type,
    },
  }));

 const BATCH_SIZE = 20;

for (let i = 0; i < points.length; i += BATCH_SIZE) {
  const batch = points.slice(i, i + BATCH_SIZE);

  await client.upsert(COLLECTION, {
    points: batch,
  });

  console.log(`Uploaded batch ${i / BATCH_SIZE + 1}`);
}

  console.log(`Stored ${points.length} chunks in Qdrant`);
  console.log("UPSERT DOCID:", docId);
};