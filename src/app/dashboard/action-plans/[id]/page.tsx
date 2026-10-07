"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { DocumentsPanel } from "@/components/documents-panel";

type ActionPlan = {
  id: number; reference: string; actionItem: string; objective: string | null; department: string | null;
  startDate: string | null; deadline: string | null; priority: string; status: string; progress: number;
  notes: string | null; responsibleYouthMpName: string | null;
};

const STATUSES = ["Pending", "In Progress", "Completed", "Delayed", "Cancelled"];

export default function ActionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<ActionPlan | null>(null);
  const [progressInput, setProgressInput] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/action-plans/${id}`).then((r) => r.json()).then((d) => { setRecord(d); setProgressInput(d.progress ?? 0); });
  }
  useEffect(load, [id]);

  async function patch(body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/action-plans/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Something went wrong.");
    else load();
    setBusy(false);
  }

  if (!record) return <p className="text-sm text-ink/60">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50">{record.reference}</p>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold text-ink">{record.actionItem}</h2>
          <StatusBadge status={record.status} />
        </div>
        <p className="text-sm text-ink/60">
          {record.priority} priority{record.responsibleYouthMpName && ` · ${record.responsibleYouthMpName}`}{record.department && ` · ${record.department}`}
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Progress</span>
          <span className="text-ink/60">{record.progress}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full bg-forest-700 transition-all" style={{ width: `${record.progress}%` }} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <input type="range" min={0} max={100} value={progressInput} onChange={(e) => setProgressInput(Number(e.target.value))} className="flex-1" />
          <button onClick={() => patch({ progress: progressInput })} disabled={busy} className="btn-secondary">Save</button>
        </div>
      </div>

      <div className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <Info label="Start Date" value={record.startDate} />
        <Info label="Deadline" value={record.deadline} />
      </div>

      {record.objective && (
        <div className="card p-6">
          <h3 className="mb-2 text-sm font-medium text-ink">Objective</h3>
          <p className="whitespace-pre-wrap text-sm text-ink/80">{record.objective}</p>
        </div>
      )}
      {record.notes && (
        <div className="card p-6">
          <h3 className="mb-2 text-sm font-medium text-ink">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-ink/80">{record.notes}</p>
        </div>
      )}

      <DocumentsPanel parentType="action_plan" parentId={record.id} />

      <div className="card p-6">
        <h3 className="mb-3 text-sm font-medium text-ink">Change Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button key={s} disabled={busy || s === record.status} onClick={() => patch({ status: s })} className="btn-secondary disabled:opacity-40">{s}</button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return <div><p className="text-xs text-ink/50">{label}</p><p className="text-sm text-ink">{value || "—"}</p></div>;
}
