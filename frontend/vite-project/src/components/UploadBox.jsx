import { useState } from "react";
import { api } from "../api";

export default function UploadBox({ setDocId }) {
  const [file, setFile] = useState(null);

const upload = async () => {
  if (!file) return;

  try {
    const form = new FormData();
    form.append("file", file);

    const res = await api.post("/upload", form);
    setDocId(res.data.docId);
    alert("Uploaded ✓");
  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed: " + (err.response?.data?.error || err.message));
  }
};

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-5">

      <h2 className="text-lg font-semibold text-purple-700 mb-3">
        📂 Upload Document
      </h2>

      <div className="border-2 border-dashed border-purple-200 rounded-xl p-4 text-center hover:bg-purple-50 transition">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full"
        />
      </div>

      <button
        onClick={upload}
        className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 rounded-xl shadow-md hover:opacity-90 transition"
      >
        Upload & Index
      </button>
    </div>
  );
}