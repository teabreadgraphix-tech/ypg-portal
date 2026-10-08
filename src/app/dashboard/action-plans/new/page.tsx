"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Lookups = { youthMps: { id: number; fullName: string }[] };

export default function NewActionPlanPage() {
  const router = useRouter();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    actionItem: "", objective: "", responsibleYouthMpId: "", department: "",
    startDate: "", deadline: "", priority: "Medium", notes: "",
  });

  useEffect(() => { fetch("/api/lookups").then((r) => r.json()).then(setLookups); }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    if (!form.actionItem) { setError("Action item is required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/action-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, responsibleYouthMpId: form.responsibleYouthMpId ? Number(form.responsibleYouthMpId) : null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      router.push(`/dashboard/action-plans/${data.id}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-6 font-serif text-lg font-semibold text-ink">New Action Plan</h2>
      <div className="card space-y-5 p-6">
        <Field label="Action Item *"><input className="field-input" value={form.actionItem} onChange={(e) => set("actionItem", e.target.value)} /></Field>
        <Field label="Objective"><textarea className="field-input" rows={2} value={form.objective} onChange={(e) => set("objective", e.target.value)} /></Field>
        <Field label="Responsible Youth MP">
          <select className="field-input" value={form.responsibleYouthMpId} onChange={(e) => set("responsibleYouthMpId", e.target.value)}>
            <option value="">None / Office staff</option>
            {lookups?.youthMps.map((mp) => <option key={mp.id} value={mp.id}>{mp.fullName}</option>)}
          </select>
        </Field>
        <Field label="Department"><input className="field-input" value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
        <Row>
          <Field label="Start Date"><input type="date" className="field-input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label="Deadline"><input type="date" className="field-input" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        </Row>
        <Field label="Priority">
          <select className="field-input" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Notes"><textarea className="field-input" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button onClick={submit} disabled={submitting} className="btn-primary w-full">Create Action Plan</button>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="field-label">{label}</label>{children}</div>; }
