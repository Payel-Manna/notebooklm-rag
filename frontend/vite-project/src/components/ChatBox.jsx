import { useState, useEffect, useRef } from "react";
import { api } from "../api";

export default function ChatBox({ docId, onSources }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  const send = async () => {
    if (!input.trim()) return;
    if (!docId) {
      alert("Upload a document first!");
      return;
    }

    const question = input;

    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/query", {
        question,
        docId, // 🔥 IMPORTANT FIX
      });

      setMessages((m) => [
        ...m,
        { role: "bot", text: res.data.answer },
      ]);

      onSources(res.data.sources || []);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "❌ Error fetching answer" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-blue-100 flex flex-col h-[80vh]">

      {/* HEADER */}
      <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <h1 className="font-bold text-lg text-indigo-700">
          📘 NotebookLM RAG
        </h1>
        <p className="text-sm text-gray-500">
          Ask grounded questions
        </p>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                : "bg-white border border-gray-200 text-gray-800"
            }`}
          >
            {m.text}
          </div>
        ))}

        {/* LOADING STATE */}
        {loading && (
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl text-sm text-gray-500 w-fit">
            Thinking from document...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something about your document..."
          className="flex-1 border border-indigo-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-300 outline-none"
        />

        <button
          onClick={send}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 rounded-xl shadow hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
    </div>
  );
}