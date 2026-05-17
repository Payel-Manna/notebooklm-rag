
import { useState, useRef } from 'react';

export default function UploadBox({ api, onUpload, serverReady }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [message, setMessage] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'txt'].includes(ext)) {
      setStatus('error');
      setMessage('Only PDF or TXT files are supported.');
      return;
    }

    setStatus('uploading');
    setMessage(`Processing "${file.name}"…`);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${api}/upload`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(180000), // 2 min timeout
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setStatus('done');
      setMessage(`✓ ${data.chunks} chunks indexed`);
      setTimeout(() => onUpload(data.docId, file.name), 600);
    } catch (err) {
      setStatus('error');
      setMessage(err.name === 'TimeoutError'
        ? 'Upload timed out. The server may be cold-starting — try again in 30s.'
        : `Upload failed: ${err.message}`);
    }
  };

  return (
    <div className="upload-box-wrapper">
      <div
        className={`upload-drop ${drag ? 'drag-over' : ''} ${status}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => status !== 'uploading' && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />

        {status === 'idle' && (
          <>
            <div className="drop-icon">⬆</div>
            <div className="drop-title">Drop your file here</div>
            <div className="drop-sub">or click to browse · PDF or TXT</div>
          </>
        )}
        {status === 'uploading' && (
          <>
            <div className="spinner" />
            <div className="drop-title">Uploading…</div>
            <div className="drop-sub">{message}</div>
          </>
        )}
        {status === 'done' && (
          <>
            <div className="drop-icon success">✓</div>
            <div className="drop-title">Success!</div>
            <div className="drop-sub">{message}</div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="drop-icon error">✕</div>
            <div className="drop-title">Upload failed</div>
            <div className="drop-sub">{message}</div>
            <button className="retry-btn" onClick={e => { e.stopPropagation(); setStatus('idle'); setMessage(''); }}>
              Try again
            </button>
          </>
        )}
      </div>

      {!serverReady && status === 'idle' && (
        <div className="server-warning">
          ⚠ Server may be cold-starting on Render. If upload fails, wait 30s and retry.
        </div>
      )}
    </div>
  );
}