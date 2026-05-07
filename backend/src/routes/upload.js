import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

import { extractText } from "../utils/extractText.js";
import { chunkText } from "../rag/chunker.js";
import { getEmbedding } from "../rag/embed.js";
import { addChunks, clearStore } from "../rag/store.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const docId = uuidv4();

    // 1. Extract text
   const text = await extractText(req.file.buffer, req.file.mimetype);

    // 2. Chunking (hybrid)
    const { sectionChunks, semanticChunks } = chunkText(text);

    // 3. Embeddings
    const sectionEmbeddings = await Promise.all(
      sectionChunks.map((c) => getEmbedding(c))
    );

    const semanticEmbeddings = await Promise.all(
      semanticChunks.map((c) => getEmbedding(c))
    );

    // 4. Clear old chunks for this doc
    await clearStore(docId);

    // 5. Store with metadata
    await addChunks(sectionChunks, sectionEmbeddings, docId, "section");
    await addChunks(semanticChunks, semanticEmbeddings, docId, "semantic");

    console.log(
      "Stored chunks:",
      sectionChunks.length + semanticChunks.length
    );

    // 6. Response
    res.json({
      message: "Document processed successfully",
      docId,
      chunks: sectionChunks.length + semanticChunks.length,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;