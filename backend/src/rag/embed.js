import { pipeline } from "@xenova/transformers";

let extractor;

export const initEmbedding = async () => {
  extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
};

export const getEmbedding = async (text) => {
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
};