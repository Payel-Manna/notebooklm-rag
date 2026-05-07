import { useState } from "react";
import UploadBox from "./components/UploadBox";
import ChatBox from "./components/ChatBox";
import Sources from "./components/Sources";

export default function App() {
  const [docId, setDocId] = useState(null);
  const [sources, setSources] = useState([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">

        {/* Upload */}
        <div className="col-span-3">
          <UploadBox setDocId={setDocId} />
        </div>

        {/* Chat */}
        <div className="col-span-6">
          <ChatBox 
            docId={docId} 
            onSources={setSources} 
          />
        </div>

        {/* Sources */}
        <div className="col-span-3">
          <Sources sources={sources} />
        </div>

      </div>
    </div>
  );
}