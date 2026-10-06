"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

type Project = { id: number; reference: string; name: string; status: string; progress: number; updatedAt: string };

const STATUSES = ["Planned", "Approved", "Ongoing", "Suspended", "Completed", "Archived"];

export default function ProjectsPage() {
  const [rows, setRows] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    setLoading(true);
    fetch(`/api/projects?${params}`).then((r) => r.json()).then((d) => setRows(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [search, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Projects</h2>
          <p className="text-sm text-ink/60">Projects underway or completed across all constituencies.</p>
        </div>
        <Link href="/dashboard/projects/new" className="btn-primary">+ New Project</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="field-input max-w-xs" placeholder="Search name or reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="field-input max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink/60">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink/60">No projects yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="card block p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-ink/50">{p.reference}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full bg-forest-700" style={{ width: `${p.progress}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink/50">{p.progress}% complete</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
