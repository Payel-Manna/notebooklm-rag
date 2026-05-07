export let vectorStore = [];

export const addChunks = (chunks, embeddings, docId, type) => {
  chunks.forEach((chunk, i) => {
    vectorStore.push({
      text: clean(chunk),
      embedding: embeddings[i],
      docId,
      type,
    });
  });
};

export const clearStore = () => {
  vectorStore = [];
};

function clean(text) {
  return text
    .replace(/<pad>|<EOS>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}