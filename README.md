# NotebookLM RAG

A RAG-powered document QA application inspired by Google NotebookLM.
Upload any PDF or plain text file and have a grounded conversation with it —
answers come strictly from your document, not from the LLM's general knowledge.

## Live Demo

[https://notebooklm-rag-phi.vercel.app/]

## GitHub Repository

[https://github.com/Payel-Manna/notebooklm-rag]

---

## What This App Does

1. User uploads a PDF or `.txt` file
2. Text is extracted and split into chunks using a hybrid chunking strategy
3. Each chunk is embedded using a local sentence transformer model
4. Embeddings are stored and indexed for similarity search
5. User asks a natural language question
6. The question is embedded and the most relevant chunks are retrieved
7. Retrieved chunks are passed as context to an LLM
8. The LLM answers strictly from the document — not from memory

---

## RAG Pipeline

```
Document Upload
      ↓
Text Extraction (PDF / TXT)
      ↓
Hybrid Chunking (Section + Sliding Window)
      ↓
Embedding (MiniLM L6 v2 — 384 dimensions)
      ↓
Vector Storage (In-memory cosine similarity index)
      ↓
User Question → Embed Question
      ↓
Top-K Retrieval (cosine similarity, filtered by docId)
      ↓
Context Assembly
      ↓
LLM Generation (Llama 3.1 8B via Groq)
      ↓
Grounded Answer + Sources
```

---

## Chunking Strategy

Two chunking strategies are implemented and combined:

### 1. Section-Based Chunking
The document is split on section boundaries using the regex `/\n(?=\d+\.\d+)/g`.
This preserves the logical structure of academic papers and structured documents,
keeping related content together within a single chunk.

### 2. Sliding Window Semantic Chunking
The full text is split into overlapping word windows:
- Window size: 150 words
- Stride: 80 words (70-word overlap between consecutive chunks)
- Minimum chunk length: 50 characters

This ensures that no information is lost at section boundaries and that
semantically related sentences that span sections are still retrievable.

Both chunk sets are embedded and stored together, giving the retriever
access to both structurally coherent and semantically continuous chunks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Text Extraction | pdf-parse (PDF), fs (TXT) |
| Chunking | Custom hybrid (section + sliding window) |
| Embedding Model | Xenova/all-MiniLM-L6-v2 (384-dim, runs locally) |
| Vector Storage | In-memory store with cosine similarity search |
| LLM | Llama 3.1 8B Instant via Groq API |

---

## Project Structure

```
NOTEBOOKLM-RAG/
├── backend/
│   ├── src/
│   │   ├── rag/
│   │   │   ├── chunker.js       # Hybrid chunking logic
│   │   │   ├── embed.js         # MiniLM embedding pipeline
│   │   │   ├── retriever.js     # Cosine similarity retrieval
│   │   │   ├── store.js         # In-memory vector store
│   │   │   └── generate.js      # Groq LLM generation
│   │   ├── routes/
│   │   │   ├── upload.js        # File ingestion endpoint
│   │   │   └── query.js         # Question answering endpoint
│   │   ├── services/
│   │   │   └── groq.js          # Groq client setup
│   │   └── utils/
│   │       └── extractText.js   # PDF and TXT text extraction
│   └── server.js
├── frontend/vite-project/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadBox.jsx    # File upload UI
│   │   │   ├── ChatBox.jsx      # Chat interface
│   │   │   └── Sources.jsx      # Retrieved sources panel
│   │   └── App.jsx
└── README.md
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```
GROQ_API_KEY=your_groq_api_key_here
```

Start the server:

```bash
npm start
```

Backend runs on `http://localhost:3000`

### Frontend

```bash
cd frontend/vite-project
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | Groq API key for LLM generation |
| `VITE_API_URL` | Vercel dashboard | Backend URL in production |

---

## API Endpoints

### `POST /upload`
Uploads and indexes a document.

**Request:** `multipart/form-data` with a `file` field

**Response:**
```json
{
  "message": "Document processed successfully",
  "docId": "uuid-here",
  "chunks": 111
}
```

### `POST /query`
Asks a question against an indexed document.

**Request:**
```json
{
  "question": "What is the encoder?",
  "docId": "uuid-here"
}
```

**Response:**
```json
{
  "answer": "The encoder is...",
  "sources": [
    { "text": "...", "type": "section", "score": 0.31 }
  ]
}
```

