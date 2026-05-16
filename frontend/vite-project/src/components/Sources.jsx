// export default function Sources({ sources }) {
//   return (
//     <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-4 h-[80vh] overflow-y-auto">

//       <h2 className="font-semibold text-green-700 mb-3">
//         📄 Sources
//       </h2>

//       {sources.length === 0 ? (
//         <p className="text-sm text-gray-400">
//           Ask a question to see sources
//         </p>
//       ) : (
//         sources.map((s, i) => (
//           <div
//             key={i}
//             className="text-xs bg-green-50 border border-green-100 rounded-lg p-2 mb-2"
//           >
//             <div className="flex justify-between text-green-600 font-medium mb-1">
//               <span>#{i + 1} · {s.type}</span>
//               <span>score: {s.score.toFixed(3)}</span>
//             </div>
//             {s.text.slice(0, 300)}...
//           </div>
//         ))
//       )}
//     </div>
//   );
// }
// frontend/vite-project/src/components/Sources.jsx
export default function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="sources-panel">
      <h3>Retrieved Sources</h3>
      {sources.map((s, i) => (
        <div key={i} className="source-card">
          <div className="source-header">
            <span className="source-type">{s.type}</span>
            <span className="source-score">
              {((s.rerankScore ?? s.score ?? 0) * 10).toFixed(0)}% match
            </span>
          </div>
          <p className="source-text">{s.text}</p>
        </div>
      ))}
    </div>
  );
}