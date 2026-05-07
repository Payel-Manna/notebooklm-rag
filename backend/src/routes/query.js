import express from "express";
import { getEmbedding } from "../rag/embed.js";
import { retrieveTopK } from "../rag/retriever.js";
import { generateAnswer } from "../rag/generate.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { question, docId } = req.body;

    if (!docId) {
      return res.status(400).json({
        error: "docId missing. Upload document first.",
      });
    }

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // 1. Embed query
    const queryEmbedding = await getEmbedding(question);

    // 2. Retrieve relevant chunks
    const topChunks = await retrieveTopK(queryEmbedding, docId);

    // fallback
    if (!topChunks.length) {
      return res.json({
        answer: "No relevant context found in the document.",
        sources: [],
      });
    }

    // 3. Build context
    const context = topChunks
      .map((c) => c.text)
      .join("\n\n")
      .slice(0, 12000);

    // 4. Generate answer
    const answer = await generateAnswer(context, question);

    // 5. Response
    res.json({
      answer,
      sources: topChunks.map((c) => ({
        text: c.text,
        type: c.type,
        score: c.score,
      })),
    });
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;