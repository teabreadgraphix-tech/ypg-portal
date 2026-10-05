"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

type Proposal = {
  id: number;
  reference: string;
  title: string;
  status: string;
  budget: string | null;
  updatedAt: string;
};

const STATUSES = ["Draft", "Submitted", "Under Review", "Revision Required", "Approved", "Rejected", "Ongoing", "Completed"];

export default function ProposalsPage() {
  const [rows, setRows] = useState<Proposal[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    setLoading(true);
    fetch(`/api/proposals?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [search, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Project Proposals</h2>
          <p className="text-sm text-ink/60">Submit and review proposals for new community projects.</p>
        </div>
        <Link href="/dashboard/proposals/new" className="btn-primary">+ New Proposal</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="field-input max-w-xs"
          placeholder="Search title or reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field-input max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink/60">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink/60">No proposals yet.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded border border-line md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-forest-950 text-paper">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-forest-950/[0.03]">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/proposals/${p.id}`} className="text-forest-800 underline">{p.reference}</Link>
                    </td>
                    <td className="px-4 py-3">{p.title}</td>
                    <td className="px-4 py-3">{p.budget ? `GH₵ ${Number(p.budget).toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-ink/60">{new Date(p.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((p) => (
              <Link key={p.id} href={`/dashboard/proposals/${p.id}`} className="card block p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-ink">{p.title}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-2 text-xs text-ink/50">{p.reference}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
