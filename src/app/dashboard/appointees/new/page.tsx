"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Lookups = {
  regions: { id: number; name: string }[];
  constituencies: { id: number; name: string; regionId: number }[];
  appointmentCategories: { id: number; name: string }[];
  youthMps: { id: number; fullName: string; constituencyId: number }[];
};

export default function NewAppointeePage() {
  const router = useRouter();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", gender: "", dob: "", position: "", categoryId: "",
    constituencyId: "", regionId: "", appointingYouthMpId: "",
    phone: "", whatsapp: "", email: "", institution: "", occupation: "",
    dateAppointed: "", bio: "", notes: "",
  });

  useEffect(() => {
    fetch("/api/lookups").then((r) => r.json()).then(setLookups);
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name || !form.position || !form.constituencyId || !form.regionId || !form.appointingYouthMpId) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          constituencyId: Number(form.constituencyId),
          regionId: Number(form.regionId),
          appointingYouthMpId: Number(form.appointingYouthMpId),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (photoFile) {
        const fd = new FormData();
        fd.set("file", photoFile);
        fd.set("parentType", "appointee");
        fd.set("parentId", String(data.id));
        await fetch("/api/documents", { method: "POST", body: fd }).catch(() => {});
      }

      setSuccess(`Submission successful — reference ${data.reference}`);
      setTimeout(() => router.push(`/dashboard/appointees/${data.id}`), 1200);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredConstituencies = lookups?.constituencies.filter(
    (c) => !form.regionId || c.regionId === Number(form.regionId),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 font-serif text-lg font-semibold text-ink">Submit Appointee</h2>
      <p className="mb-6 text-sm text-ink/60">
        A reference number is generated automatically once you submit.
      </p>

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <Row>
          <Field label="Full name *">
            <input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="Gender">
            <select className="field-input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Position *">
            <input className="field-input" value={form.position} onChange={(e) => set("position", e.target.value)} required />
          </Field>
          <Field label="Appointment category">
            <select className="field-input" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Select</option>
              {lookups?.appointmentCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Region *">
            <select className="field-input" value={form.regionId} onChange={(e) => { set("regionId", e.target.value); set("constituencyId", ""); }} required>
              <option value="">Select</option>
              {lookups?.regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Constituency *">
            <select className="field-input" value={form.constituencyId} onChange={(e) => set("constituencyId", e.target.value)} required>
              <option value="">Select</option>
              {filteredConstituencies?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </Row>

        <Field label="Appointing Youth MP *">
          <select className="field-input" value={form.appointingYouthMpId} onChange={(e) => set("appointingYouthMpId", e.target.value)} required>
            <option value="">Select</option>
            {lookups?.youthMps.map((mp) => (
              <option key={mp.id} value={mp.id}>{mp.fullName}</option>
            ))}
          </select>
        </Field>

        <Row>
          <Field label="Phone"><input className="field-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp"><input className="field-input" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
        </Row>
        <Row>
          <Field label="Email"><input type="email" className="field-input" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Date appointed"><input type="date" className="field-input" value={form.dateAppointed} onChange={(e) => set("dateAppointed", e.target.value)} /></Field>
        </Row>
        <Row>
          <Field label="Institution"><input className="field-input" value={form.institution} onChange={(e) => set("institution", e.target.value)} /></Field>
          <Field label="Occupation"><input className="field-input" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
        </Row>

        <Field label="Bio">
          <textarea className="field-input" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
        </Field>
        <Field label="Notes">
          <textarea className="field-input" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <Field label="Photo (JPG/PNG, up to 25MB)">
          <input
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            className="field-input"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </Field>

        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded border border-forest-700/30 bg-forest-800/5 px-3 py-2 text-sm text-forest-800">{success}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
