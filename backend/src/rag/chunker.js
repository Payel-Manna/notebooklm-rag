export const chunkText = (text) => {
  // 🔹 SECTION CHUNKS
  const sections = text.split(/\n(?=\d+\.\d+)/g);

  const sectionChunks = sections
    .filter(Boolean)
    .map((s) => s.trim());

  // 🔹 SEMANTIC CHUNKS (sliding window)
  const words = text.split(/\s+/);
  const semanticChunks = [];

  for (let i = 0; i < words.length; i += 80) {
    const chunk = words.slice(i, i + 150).join(" ");
    if (chunk.length > 50) semanticChunks.push(chunk);
  }

  return {
    sectionChunks,
    semanticChunks,
  };
};