"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";

type Appointee = {
  id: number; reference: string; name: string; position: string; gender: string | null;
  phone: string | null; whatsapp: string | null; email: string | null; institution: string | null;
  occupation: string | null; bio: string | null; notes: string | null; status: string;
  dateAppointed: string | null; submittedAt: string; photoUrl: string | null;
};
type Doc = { id: number; originalFilename: string; blobUrl: string; mimeType: string; sizeBytes: number };

const STATUSES = ["Pending", "Active", "Inactive", "Resigned", "Removed"];

export default function AppointeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<Appointee | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/appointees/${id}`).then((r) => r.json()).then(setRecord);
    fetch(`/api/documents?parentType=appointee&parentId=${id}`).then((r) => r.json()).then((d) => setDocs(Array.isArray(d) ? d : []));
  }
  useEffect(load, [id]);

  async function changeStatus(status: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/appointees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Could not update status.");
    else setRecord(data);
    setSaving(false);
  }

  if (!record) return <p className="text-sm text-ink/60">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50">{record.reference}</p>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">{record.name}</h2>
          <StatusBadge status={record.status} />
        </div>
        <p className="text-sm text-ink/60">{record.position}</p>
      </div>

      <div className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <Info label="Gender" value={record.gender} />
        <Info label="Date appointed" value={record.dateAppointed} />
        <Info label="Phone" value={record.phone} />
        <Info label="WhatsApp" value={record.whatsapp} />
        <Info label="Email" value={record.email} />
        <Info label="Institution" value={record.institution} />
        <Info label="Occupation" value={record.occupation} />
        <Info label="Submitted" value={new Date(record.submittedAt).toLocaleDateString()} />
      </div>

      {record.bio && (
        <div className="card p-6">
          <h3 className="mb-2 text-sm font-medium text-ink">Bio</h3>
          <p className="text-sm text-ink/80">{record.bio}</p>
        </div>
      )}

      <div className="card p-6">
        <h3 className="mb-3 text-sm font-medium text-ink">Supporting Documents</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-ink/60">No documents uploaded.</p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.id}>
                <a href={d.blobUrl} target="_blank" rel="noreferrer" className="text-sm text-forest-800 underline">
                  {d.originalFilename}
                </a>
                <span className="ml-2 text-xs text-ink/50">{(d.sizeBytes / 1024).toFixed(0)} KB</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h3 className="mb-3 text-sm font-medium text-ink">Change Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={saving || s === record.status}
              onClick={() => changeStatus(s)}
              className="btn-secondary disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <p className="mt-2 text-xs text-ink/50">Only Super Admin / Deputy Project Manager accounts can change status.</p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink/50">{label}</p>
      <p className="text-sm text-ink">{value || "—"}</p>
    </div>
  );
}
