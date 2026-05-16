// import { useState } from "react";
// import UploadBox from "./components/UploadBox";
// import ChatBox from "./components/ChatBox";
// import Sources from "./components/Sources";

// export default function App() {
//   const [docId, setDocId] = useState(null);
//   const [sources, setSources] = useState([]);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">

//       <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">

//         {/* Upload */}
//         <div className="col-span-3">
//           <UploadBox setDocId={setDocId} />
//         </div>

//         {/* Chat */}
//         <div className="col-span-6">
//           <ChatBox 
//             docId={docId} 
//             onSources={setSources} 
//           />
//         </div>

//         {/* Sources */}
//         <div className="col-span-3">
//           <Sources sources={sources} />
//         </div>

//       </div>
//     </div>
//   );
// }
// frontend/vite-project/src/App.jsx
import { useState, useEffect } from 'react';
import UploadBox from './components/UploadBox';
import ChatBox from './components/ChatBox';
import Sources from './components/Sources';

const API = import.meta.env.VITE_API_URL || 'https://notebooklm-rag.onrender.com';

export default function App() {
  const [docId, setDocId] = useState(null);
  const [docName, setDocName] = useState('');
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [meta, setMeta] = useState(null);
  const [serverReady, setServerReady] = useState(false);
  const [warming, setWarming] = useState(true);

  // Warm up Render on load — prevents silent upload failures
  useEffect(() => {
    const warm = async () => {
      setWarming(true);
      try {
        const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(30000) });
        if (res.ok) setServerReady(true);
      } catch {
        setServerReady(false); // show warning but still let user try
      } finally {
        setWarming(false);
      }
    };
    warm();
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">NotebookRAG</span>
          <span className="logo-badge">Advanced</span>
        </div>
        <div className="header-right">
          {warming && <span className="status warming">⟳ Warming server…</span>}
          {!warming && serverReady && <span className="status ready">● Server ready</span>}
          {!warming && !serverReady && <span className="status offline">⚠ Server unreachable</span>}
        </div>
      </header>

      <main className="app-main">
        {!docId ? (
          <div className="upload-center">
            <div className="upload-hero">
              <h1>Chat with your documents</h1>
              <p>Upload a PDF or text file to start a grounded conversation powered by advanced RAG</p>
              <div className="feature-chips">
                {['Query Rewriting','Sub-queries','HyDE','LLM Judge','Corrective RAG','Re-ranking'].map(f => (
                  <span key={f} className="chip">{f}</span>
                ))}
              </div>
            </div>
            <UploadBox
              api={API}
              onUpload={(id, name) => { setDocId(id); setDocName(name); }}
              serverReady={serverReady}
            />
          </div>
        ) : (
          <div className="workspace">
            <aside className="sidebar">
              <div className="doc-badge">
                <span className="doc-icon">📄</span>
                <div>
                  <div className="doc-name">{docName}</div>
                  <div className="doc-sub">Document loaded</div>
                </div>
                <button className="change-doc" onClick={() => {
                  setDocId(null); setMessages([]); setSources([]); setMeta(null);
                }}>✕</button>
              </div>

              {meta && (
                <div className="meta-panel">
                  <h3>Query Intelligence</h3>
                  <div className="meta-item">
                    <span className="meta-label">Rewritten</span>
                    <span className="meta-value">{meta.rewrittenQuery}</span>
                  </div>
                  {meta.subQueries?.length > 1 && (
                    <div className="meta-item">
                      <span className="meta-label">Sub-queries</span>
                      <ul className="sub-queries">
                        {meta.subQueries.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="meta-item judgment">
                    <span className="meta-label">LLM Judge</span>
                    <div className="scores">
                      <div className="score-pill" style={{ '--c': scoreColor(meta.judgment?.faithfulness) }}>
                        Faithful {meta.judgment?.faithfulness}/10
                      </div>
                      <div className="score-pill" style={{ '--c': scoreColor(meta.judgment?.relevance) }}>
                        Relevant {meta.judgment?.relevance}/10
                      </div>
                    </div>
                    {meta.corrected && <span className="corrected-badge">✓ Corrective RAG applied</span>}
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Chunks used</span>
                    <span className="meta-value">{meta.chunksUsed}</span>
                  </div>
                </div>
              )}

              <Sources sources={sources} />
            </aside>

            <ChatBox
              api={API}
              docId={docId}
              messages={messages}
              setMessages={setMessages}
              onResult={(s, m) => { setSources(s); setMeta(m); }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function scoreColor(score) {
  if (!score) return '#888';
  if (score >= 7) return '#4ade80';
  if (score >= 4) return '#facc15';
  return '#f87171';
}