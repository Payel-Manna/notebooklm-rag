# ◈ NotebookRAG — Advanced Document QA with RAG

> Chat with your documents using a production-grade Retrieval-Augmented Generation pipeline inspired by Google NotebookLM. Upload any PDF or text file and get grounded, verifiable answers — powered by query rewriting, HyDE, sub-query decomposition, cross-encoder re-ranking, LLM judging, and corrective RAG.

**Live Demo:** [notebooklm-rag-phi.vercel.app](https://notebooklm-rag-phi.vercel.app)

---

## Table of Contents

- [What This App Does](#what-this-app-does)
- [RAG Pipeline — How It Works](#rag-pipeline--how-it-works)
- [Advanced Features](#advanced-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Chunking Strategy](#chunking-strategy)
- [Design Decisions & Tradeoffs](#design-decisions--tradeoffs)

---

## What This App Does

1. User uploads a **PDF or `.txt` file**
2. Text is extracted and split into chunks using a **hybrid chunking strategy** (section-based + sliding window)
3. Each chunk is embedded using a **local sentence transformer model** (MiniLM-L6-v2, 384 dimensions)
4. Embeddings are stored in **Qdrant** (cloud vector database) with a `docId` filter index
5. User asks a natural language question
6. The question goes through a **multi-stage query intelligence pipeline**:
   - Query rewriting for better retrieval
   - Sub-query decomposition for complex questions
   - HyDE (Hypothetical Document Embedding) for semantic alignment
7. Top candidates are retrieved from Qdrant and **re-ranked by an LLM cross-encoder**
8. An LLM generates the answer **strictly from the retrieved context**
9. An **LLM judge** scores faithfulness and relevance; if faithfulness is low, **Corrective RAG** automatically regenerates a grounded answer
10. Answer, sources, scores, and pipeline metadata are returned to the UI

---

## RAG Pipeline — How It Works

```
User Question
      │
      ▼
┌─────────────────────────┐
│   1. Query Rewriting    │  ← LLM cleans up vague/ambiguous phrasing
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. Sub-query Decompose  │  ← Complex questions split into 2-3 focused sub-queries
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  3. HyDE Generation     │  ← LLM generates a hypothetical answer; its embedding
│                         │     is used as an additional retrieval vector
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  4. Qdrant Retrieval    │  ← Top-20 candidates per query via cosine similarity
│     (per sub-query      │     filtered by docId
│      + HyDE vector)     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 5. Dedup + Merge        │  ← All retrieved chunks merged and deduplicated
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 6. Cross-Encoder        │  ← LLM scores each candidate 0–10 for relevance;
│    Re-ranking           │     results re-sorted by LLM relevance score
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 7. Token Budget         │  ← Top chunks assembled up to ~6000 char context limit
│    Assembly             │     to stay within LLM context window
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  8. Answer Generation   │  ← Llama 3.1 8B via Groq; strictly context-grounded
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   9. LLM Judge          │  ← Scores answer: Faithfulness (0–10), Relevance (0–10)
└────────────┬────────────┘
             │
      faithfulness < 5?
          │         │
         YES        NO
          │         │
          ▼         ▼
┌──────────────┐  Final Answer
│ 10. Corrective│
│     RAG       │  ← Regenerates with stricter grounding prompt
└──────┬────────┘
       │
       ▼
  Final Answer + Sources + Pipeline Metadata
```

---

## Advanced Features

### Query Rewriting
Before retrieval, the user's question is rewritten by a lightweight LLM call to produce a cleaner, more specific search query. This improves recall for vague or conversational questions like *"what does it say about that encoder thing?"*

### Sub-query Decomposition
Complex multi-part questions (e.g. *"what are the pros, cons, and examples of attention mechanisms?"*) are decomposed into 2–3 focused sub-questions. Each sub-question retrieves independently, and results are merged — ensuring no part of the question is starved of relevant context.

### HyDE (Hypothetical Document Embedding)
Instead of only embedding the raw question, the system also generates a *hypothetical answer* to the question and embeds that. A hypothetical answer's embedding tends to sit much closer in vector space to the actual relevant document chunks than a bare question does — significantly improving retrieval precision.

### Cross-Encoder Re-ranking
After initial cosine-similarity retrieval (top 20 candidates), a second LLM call scores each candidate passage 0–10 for actual relevance to the question. Results are re-sorted by this score. This is more accurate than pure vector similarity because the LLM reads both the question and the passage together (like a cross-encoder), rather than comparing independent embeddings.

### LLM Judge
Every generated answer is evaluated by a separate LLM call that scores:
- **Faithfulness (0–10):** Are all claims supported by the retrieved context?
- **Relevance (0–10):** Does the answer actually address the question?

These scores are displayed in the UI sidebar so you can see how well each answer performed.

### Corrective RAG
If the LLM judge scores faithfulness below 5, the system automatically regenerates the answer with a stricter prompt that explicitly forbids using any knowledge outside the retrieved context. This acts as a self-healing loop that catches hallucinations before they reach the user.

### Token Budget Management
Context is assembled greedily from the top-ranked chunks up to a character limit (~6000 chars, roughly 1500 tokens), ensuring the LLM's context window is never overflowed regardless of document size or chunk count.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev, clean component model |
| Styling | Custom CSS (dark glassmorphism) | No Tailwind dependency, full control |
| Backend | Node.js + Express | Lightweight, ESM-native |
| Text Extraction | `pdf-parse`, `fs` | PDF + plain text support |
| Chunking | Custom hybrid (section + sliding window) | Balances structure preservation with semantic continuity |
| Embedding Model | `@xenova/transformers` — MiniLM-L6-v2 (384-dim) | Runs locally, no API cost, fast |
| Vector Database | Qdrant (cloud) | Persistent, filterable by `docId`, production-grade |
| LLM | Llama 3.1 8B Instant via Groq API | Fast inference, free tier available |
| Frontend Hosting | Vercel | Auto-deploy on push |
| Backend Hosting | Render | Free tier, auto-deploy on push |

---

## Project Structure

```
notebooklm-rag/
├── backend/
│   └── src/
│       ├── rag/
│       │   ├── chunker.js       # Hybrid chunking — section + sliding window
│       │   ├── embed.js         # MiniLM embedding pipeline (local)
│       │   ├── retriever.js     # Qdrant search + LLM cross-encoder re-ranking
│       │   ├── store.js         # Qdrant client, collection init, addChunks
│       │   └── generate.js      # Full pipeline: rewrite → decompose → HyDE
│       │                        #   → retrieve → re-rank → generate → judge → correct
│       ├── routes/
│       │   ├── upload.js        # POST /upload — extract, chunk, embed, store
│       │   └── query.js         # POST /query — full RAG pipeline
│       ├── services/
│       │   └── groq.js          # Groq client setup
│       └── utils/
│           └── extractText.js   # PDF and TXT extraction
│   └── server.js                # Express app, routes, /health endpoint
│
├── frontend/vite-project/
│   └── src/
│       ├── components/
│       │   ├── UploadBox.jsx    # Drag-and-drop upload with status states
│       │   ├── ChatBox.jsx      # Chat UI with animated pipeline step display
│       │   └── Sources.jsx      # Retrieved sources with rerank scores
│       ├── App.jsx              # Layout, server warm-up, meta/judgment display
│       └── index.css            # Dark glassmorphism design system
│
└── README.md
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- A free [Groq API key](https://console.groq.com)
- A free [Qdrant Cloud](https://cloud.qdrant.io) cluster (or run Qdrant locally with Docker)

### 1. Clone the repo

```bash
git clone https://github.com/Payel-Manna/notebooklm-rag.git
cd notebooklm-rag
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
```

Start the backend:

```bash
npm start
```

Backend runs on `http://localhost:3000`

### 3. Frontend setup

```bash
cd frontend/vite-project
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

> The frontend is hardcoded to hit `https://notebooklm-rag.onrender.com` in production. For local development, set `VITE_API_URL=http://localhost:3000` in `frontend/vite-project/.env.local`.

---

## Deployment

### Backend → Render

1. Connect your GitHub repo to [Render](https://render.com)
2. Create a new **Web Service**
3. Set **Root Directory** to `backend`
4. Set **Start Command** to `npm start`
5. Add environment variables:
   - `GROQ_API_KEY`
   - `QDRANT_URL`
   - `QDRANT_API_KEY`

**Important:** Render free tier spins down after inactivity. The frontend sends a `/health` ping on load to wake the server before the user uploads a file. If the server shows "⟳ Warming server…" on first load, wait ~30 seconds before uploading.

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend/vite-project`
3. Vercel auto-detects Vite — no build command changes needed
4. Deploys automatically on every push to `main`

---

## API Reference

### `GET /health`

Returns server status. Used by the frontend to wake the Render instance on cold start.

**Response:**
```json
{ "status": "ok", "uptime": 42.3 }
```

---

### `POST /upload`

Uploads and indexes a document.

**Request:** `multipart/form-data` with a `file` field (PDF or TXT)

**Response:**
```json
{
  "message": "Document processed successfully",
  "docId": "ecae5b87-ad19-4010-96d3-4ca7ba704370",
  "chunks": 118
}
```

---

### `POST /query`

Runs the full RAG pipeline against an indexed document.

**Request:**
```json
{
  "question": "What is the role of the attention mechanism?",
  "docId": "ecae5b87-ad19-4010-96d3-4ca7ba704370"
}
```

**Response:**
```json
{
  "answer": "The attention mechanism allows the model to...",
  "sources": [
    { "text": "...", "type": "section", "score": 8.2 }
  ],
  "meta": {
    "rewrittenQuery": "What is the function of attention mechanisms in transformer models?",
    "subQueries": ["What is attention?", "How does it work in transformers?"],
    "judgment": { "faithfulness": 9, "relevance": 8, "issues": null },
    "corrected": false,
    "chunksUsed": 5
  }
}
```

---

## Chunking Strategy

Two strategies run on every document and their outputs are combined:

### Section-Based Chunking
Splits on structural boundaries — numbered sections (`1.2`, `2.`), markdown headers (`##`), and all-caps title lines. Preserves logical document structure and keeps related content together. Best for academic papers and structured reports.

### Sliding Window Chunking
Splits the full text into overlapping word windows:

| Config | Window Size | Stride | Overlap |
|--------|------------|--------|---------|
| Small  | 80 words   | 50     | 30 words — fine-grained, good for factual QA |
| Medium | 150 words  | 80     | 70 words — balanced default |
| Large  | 300 words  | 180    | 120 words — better for narrative/context-heavy docs |

Overlap ensures that no information is lost at chunk boundaries — a sentence split across two chunks will appear in full in at least one of them.

Both chunk sets are embedded and stored together, giving the retriever access to both structurally coherent and semantically continuous passages.

---

## Design Decisions & Tradeoffs

**Why Qdrant over in-memory store?**
In-memory vectors are lost on every server restart (which happens constantly on Render free tier). Qdrant persists embeddings across restarts and supports filtered search by `docId`, enabling multi-document support.

**Why Llama 3.1 8B via Groq instead of GPT-4?**
Groq's LPU inference is extremely fast (often <1s for 8B models) and has a generous free tier. For a document QA use case where answers must be grounded in context, a well-prompted 8B model performs comparably to larger models at a fraction of the cost and latency.

**Why local MiniLM embeddings instead of OpenAI embeddings?**
Zero API cost, no rate limits, and 384-dimensional embeddings are fast to compute and store. For document QA over a single document, the quality difference vs. `text-embedding-ada-002` is negligible.

**Why cross-encoder re-ranking via LLM prompt instead of a dedicated cross-encoder model?**
A proper cross-encoder (like `ms-marco-MiniLM`) would be more accurate, but requires loading another model into memory on a free-tier server with limited RAM. Using a Groq LLM call for re-ranking reuses infrastructure already in place and adds no memory overhead.

**Why HyDE?**
Raw question embeddings often sit far from the relevant document chunks in vector space — especially for short or vague questions. A hypothetical answer uses the same vocabulary and phrasing as the document, bridging the semantic gap.

---

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | Groq API key for all LLM calls |
| `QDRANT_URL` | `backend/.env` | Qdrant cluster URL |
| `QDRANT_API_KEY` | `backend/.env` | Qdrant API key |
| `VITE_API_URL` | `frontend/.env.local` | Backend URL (local dev only) |

---

## License

MIT