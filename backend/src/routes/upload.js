import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { extractText } from "../utils/extractText.js";
import { chunkText } from "../rag/chunker.js";
import { getEmbedding } from "../rag/embed.js";
import { addChunks } from "../rag/store.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Embed in small batches to avoid CPU timeout on free tier
async function embedInBatches(chunks, batchSize = 5) {
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(batch.map(c => getEmbedding(c)));
    embeddings.push(...batchEmbeddings);
    console.log(`Embedded batch ${Math.floor(i/batchSize)+1}/${Math.ceil(chunks.length/batchSize)}`);
  }
  return embeddings;
}

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const docId = uuidv4();

    // 1. Extract text
    const text = await extractText(req.file.buffer, req.file.mimetype);
    console.log(`Extracted text: ${text.length} chars`);

    // 2. Chunk — limit total chunks to avoid timeout
    const { sectionChunks, semanticChunks } = chunkText(text);

    // Cap chunks on free tier to prevent timeout
    const MAX_CHUNKS = 60;
    const cappedSection  = sectionChunks.slice(0, Math.floor(MAX_CHUNKS * 0.4));
    const cappedSemantic = semanticChunks.slice(0, Math.ceil(MAX_CHUNKS * 0.6));
    console.log(`Chunks: ${cappedSection.length} section + ${cappedSemantic.length} semantic`);

    // 3. Embed in batches
    const sectionEmbeddings  = await embedInBatches(cappedSection, 5);
    const semanticEmbeddings = await embedInBatches(cappedSemantic, 5);

    // 4. Store
    await addChunks(cappedSection,  sectionEmbeddings,  docId, "section");
    await addChunks(cappedSemantic, semanticEmbeddings, docId, "semantic");

    const total = cappedSection.length + cappedSemantic.length;
    console.log("Stored chunks:", total);

    res.json({
      message: "Document processed successfully",
      docId,
      chunks: total,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

export default router;