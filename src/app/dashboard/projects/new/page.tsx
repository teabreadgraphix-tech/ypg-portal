"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Lookups = {
  youthMps: { id: number; fullName: string; constituencyId: number; regionId: number }[];
};

function NewProjectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const fromProposal = params.get("fromProposal");
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", youthMpId: "", startDate: "", endDate: "", budget: "",
    fundingSource: "", beneficiaries: "", location: "", objectives: "",
  });

  useEffect(() => {
    fetch("/api/lookups").then((r) => r.json()).then(setLookups);
    if (fromProposal) {
      fetch(`/api/proposals/${fromProposal}`).then((r) => r.json()).then((p) => {
        setForm((f) => ({
          ...f,
          name: p.title || f.name,
          startDate: p.startDate || "",
          endDate: p.endDate || "",
          budget: p.budget || "",
          fundingSource: p.fundingSource || "",
          beneficiaries: p.beneficiaries || "",
          location: p.location || "",
          objectives: p.objectives || "",
          youthMpId: String(p.youthMpId || ""),
        }));
      });
    }
  }, [fromProposal]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    const mp = lookups?.youthMps.find((m) => m.id === Number(form.youthMpId));
    if (!form.name || !mp) {
      setError("Name and Youth MP are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          proposalId: fromProposal ? Number(fromProposal) : null,
          youthMpId: mp.id,
          constituencyId: mp.constituencyId,
          regionId: mp.regionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      router.push(`/dashboard/projects/${data.id}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 font-serif text-lg font-semibold text-ink">New Project</h2>
      <p className="mb-6 text-sm text-ink/60">
        {fromProposal ? "Pre-filled from the approved proposal." : "Create a project directly."}
      </p>
      <div className="card space-y-5 p-6">
        <Field label="Name *"><input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Youth MP *">
          <select className="field-input" value={form.youthMpId} onChange={(e) => set("youthMpId", e.target.value)}>
            <option value="">Select</option>
            {lookups?.youthMps.map((mp) => <option key={mp.id} value={mp.id}>{mp.fullName}</option>)}
          </select>
        </Field>
        <Row>
          <Field label="Start Date"><input type="date" className="field-input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label="End Date"><input type="date" className="field-input" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
        </Row>
        <Row>
          <Field label="Budget (GH₵)"><input type="number" className="field-input" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
          <Field label="Funding Source"><input className="field-input" value={form.fundingSource} onChange={(e) => set("fundingSource", e.target.value)} /></Field>
        </Row>
        <Field label="Location"><input className="field-input" value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Beneficiaries"><textarea className="field-input" rows={2} value={form.beneficiaries} onChange={(e) => set("beneficiaries", e.target.value)} /></Field>
        <Field label="Objectives"><textarea className="field-input" rows={2} value={form.objectives} onChange={(e) => set("objectives", e.target.value)} /></Field>
        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button onClick={submit} disabled={submitting} className="btn-primary w-full">Create Project</button>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="field-label">{label}</label>{children}</div>; }

export default function NewProjectPage() {
  return <Suspense><NewProjectForm /></Suspense>;
}
