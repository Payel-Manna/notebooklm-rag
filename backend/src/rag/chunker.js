// export const chunkText = (text) => {
//   // 🔹 SECTION CHUNKS
//   const sections = text.split(/\n(?=\d+\.\d+)/g);

//   const sectionChunks = sections
//     .filter(Boolean)
//     .map((s) => s.trim());

//   // 🔹 SEMANTIC CHUNKS (sliding window)
//   const words = text.split(/\s+/);
//   const semanticChunks = [];

//   for (let i = 0; i < words.length; i += 80) {
//     const chunk = words.slice(i, i + 150).join(" ");
//     if (chunk.length > 50) semanticChunks.push(chunk);
//   }

//   return {
//     sectionChunks,
//     semanticChunks,
//   };
// };
// backend/src/rag/chunker.js
// Upgraded: configurable chunk sizes, overlap tradeoffs, better section detection

export const CHUNK_CONFIGS = {
  small:  { windowSize: 80,  stride: 50,  minLen: 30  },  // fine-grained, better for facts
  medium: { windowSize: 150, stride: 80,  minLen: 50  },  // balanced (default)
  large:  { windowSize: 300, stride: 180, minLen: 100 },  // better for narrative/context
};

export function chunkDocument(text, config = 'medium') {
  const cfg = typeof config === 'string' ? CHUNK_CONFIGS[config] : config;
  const sectionChunks  = sectionChunk(text);
  const slidingChunks  = slidingWindowChunk(text, cfg);
  return [...sectionChunks, ...slidingChunks];
}

function sectionChunk(text) {
  // Detect headers: numbered sections, markdown ##, ALL CAPS lines, etc.
  const parts = text.split(/\n(?=(?:\d+[\.\)]\s|\#{1,3}\s|[A-Z][A-Z\s]{4,}\n))/g);
  return parts
    .map(t => t.trim())
    .filter(t => t.length > 50)
    .map(t => ({ text: t, type: 'section' }));
}

function slidingWindowChunk(text, { windowSize, stride, minLen }) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += stride) {
    const slice = words.slice(i, i + windowSize).join(' ');
    if (slice.length >= minLen) {
      chunks.push({ text: slice, type: 'sliding' });
    }
    if (i + windowSize >= words.length) break;
  }
  return chunks;
}