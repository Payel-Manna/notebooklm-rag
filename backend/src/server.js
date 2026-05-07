import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import uploadRoute from "./routes/upload.js";
import queryRoute from "./routes/query.js";
import { initEmbedding } from "./rag/embed.js";
import { initStore } from "./rag/store.js";

const app = express();
app.use(cors());
app.use(express.json());

await initEmbedding();
await initStore();

app.use("/upload", uploadRoute);
app.use("/query", queryRoute);
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});