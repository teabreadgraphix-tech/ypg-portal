"use client";

import { useEffect, useState } from "react";

type Doc = { id: number; originalFilename: string; blobUrl: string; mimeType: string; sizeBytes: number };

const FILE_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "application/msword": "📝",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
  "application/vnd.ms-excel": "📊",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
  "application/vnd.ms-powerpoint": "📙",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "📙",
};

export function DocumentsPanel({ parentType, parentId }: { parentType: string; parentId: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/documents?parentType=${parentType}&parentId=${parentId}`)
      .then((r) => r.json())
      .then((d) => setDocs(Array.isArray(d) ? d : []));
  }
  useEffect(load, [parentType, parentId]);

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("parentType", parentType);
    fd.set("parentId", String(parentId));
    const res = await fetch("/api/documents", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Upload failed.");
    else {
      setFile(null);
      load();
    }
    setUploading(false);
  }

  return (
    <div className="card p-6">
      <h3 className="mb-3 text-sm font-medium text-ink">Documents</h3>
      {docs.length === 0 ? (
        <p className="text-sm text-ink/60">No documents uploaded yet.</p>
      ) : (
        <ul className="mb-4 space-y-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span>{FILE_ICON[d.mimeType] ?? "📎"}</span>
              <a href={d.blobUrl} target="_blank" rel="noreferrer" className="text-sm text-forest-800 underline">
                {d.originalFilename}
              </a>
              <span className="text-xs text-ink/50">{(d.sizeBytes / 1024).toFixed(0)} KB</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field-input max-w-xs text-sm"
        />
        <button onClick={upload} disabled={!file || uploading} className="btn-secondary">
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <p className="mt-2 text-xs text-ink/50">PDF, Word, Excel, PowerPoint, or images. Up to 25MB.</p>
    </div>
  );
}
