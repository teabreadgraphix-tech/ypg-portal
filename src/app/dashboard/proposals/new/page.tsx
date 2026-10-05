"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Lookups = {
  regions: { id: number; name: string }[];
  constituencies: { id: number; name: string; regionId: number }[];
  projectCategories: { id: number; name: string }[];
  youthMps: { id: number; fullName: string; constituencyId: number; regionId: number }[];
};

export default function NewProposalPage() {
  const router = useRouter();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", youthMpId: "", categoryId: "",
    problemStatement: "", background: "", objectives: "", beneficiaries: "",
    activities: "", expectedOutcomes: "", methodology: "", location: "",
    startDate: "", endDate: "", budget: "", fundingSource: "", partners: "",
    sustainabilityPlan: "", mePlan: "",
  });

  useEffect(() => {
    fetch("/api/lookups").then((r) => r.json()).then(setLookups);
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(submitNow: boolean) {
    setError(null);
    if (!form.title || !form.youthMpId) {
      setError("Title and Youth MP are required.");
      return;
    }
    const mp = lookups?.youthMps.find((m) => m.id === Number(form.youthMpId));
    if (!mp) {
      setError("Please select a valid Youth MP.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          youthMpId: mp.id,
          constituencyId: mp.constituencyId,
          regionId: mp.regionId,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          submitNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(`/dashboard/proposals/${data.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 font-serif text-lg font-semibold text-ink">New Project Proposal</h2>
      <p className="mb-6 text-sm text-ink/60">Save as a draft to keep editing, or submit for review now.</p>

      <div className="card space-y-5 p-6">
        <Field label="Title *"><input className="field-input" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Youth MP (proposer) *">
          <select className="field-input" value={form.youthMpId} onChange={(e) => set("youthMpId", e.target.value)}>
            <option value="">Select</option>
            {lookups?.youthMps.map((mp) => <option key={mp.id} value={mp.id}>{mp.fullName}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className="field-input" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Select</option>
            {lookups?.projectCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Problem Statement"><textarea className="field-input" rows={3} value={form.problemStatement} onChange={(e) => set("problemStatement", e.target.value)} /></Field>
        <Field label="Background"><textarea className="field-input" rows={3} value={form.background} onChange={(e) => set("background", e.target.value)} /></Field>
        <Field label="Objectives"><textarea className="field-input" rows={3} value={form.objectives} onChange={(e) => set("objectives", e.target.value)} /></Field>
        <Field label="Beneficiaries"><textarea className="field-input" rows={2} value={form.beneficiaries} onChange={(e) => set("beneficiaries", e.target.value)} /></Field>
        <Field label="Activities"><textarea className="field-input" rows={3} value={form.activities} onChange={(e) => set("activities", e.target.value)} /></Field>
        <Field label="Expected Outcomes"><textarea className="field-input" rows={2} value={form.expectedOutcomes} onChange={(e) => set("expectedOutcomes", e.target.value)} /></Field>
        <Field label="Methodology"><textarea className="field-input" rows={2} value={form.methodology} onChange={(e) => set("methodology", e.target.value)} /></Field>
        <Row>
          <Field label="Location"><input className="field-input" value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label="Budget (GH₵)"><input type="number" className="field-input" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
        </Row>
        <Row>
          <Field label="Start Date"><input type="date" className="field-input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
          <Field label="End Date"><input type="date" className="field-input" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
        </Row>
        <Field label="Funding Source"><input className="field-input" value={form.fundingSource} onChange={(e) => set("fundingSource", e.target.value)} /></Field>
        <Field label="Partners"><input className="field-input" value={form.partners} onChange={(e) => set("partners", e.target.value)} /></Field>
        <Field label="Sustainability Plan"><textarea className="field-input" rows={2} value={form.sustainabilityPlan} onChange={(e) => set("sustainabilityPlan", e.target.value)} /></Field>
        <Field label="M&E Plan"><textarea className="field-input" rows={2} value={form.mePlan} onChange={(e) => set("mePlan", e.target.value)} /></Field>

        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => submit(false)} disabled={submitting} className="btn-secondary flex-1">Save as Draft</button>
          <button onClick={() => submit(true)} disabled={submitting} className="btn-primary flex-1">Submit for Review</button>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}
