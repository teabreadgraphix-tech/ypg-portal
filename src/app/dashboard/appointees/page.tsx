"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "@/components/status-badge";

type Appointee = {
  id: number;
  reference: string;
  name: string;
  position: string;
  phone: string | null;
  email: string | null;
  status: string;
  constituencyId: number;
  regionId: number;
  submittedAt: string;
  photoUrl: string | null;
};

function Avatar({ name, photoUrl, size = 36 }: { name: string; photoUrl: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-forest-800 font-medium text-paper"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || "?"}
    </div>
  );
}

const STATUSES = ["Pending", "Active", "Inactive", "Resigned", "Removed"];

export default function AppointeesPage() {
  const [rows, setRows] = useState<Appointee[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    setLoading(true);
    fetch(`/api/appointees?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Appointees — Master Registry</h2>
          <p className="text-sm text-ink/60">Search and manage every appointee submitted by Youth MPs.</p>
        </div>
        <Link href="/dashboard/appointees/new" className="btn-primary">
          + Submit Appointee
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="field-input max-w-xs"
          placeholder="Search name, position, phone, email, reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field-input max-w-[10rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink/60">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink/60">
          No appointees match your search yet.
        </div>
      ) : (
        <>
          {/* Table on larger screens */}
          <div className="hidden overflow-x-auto rounded border border-line md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-forest-950 text-paper">
                <tr>
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-forest-950/[0.03]">
                    <td className="px-4 py-3"><Avatar name={a.name} photoUrl={a.photoUrl} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/appointees/${a.id}`} className="text-forest-800 underline">
                        {a.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{a.name}</td>
                    <td className="px-4 py-3">{a.position}</td>
                    <td className="px-4 py-3">{a.phone ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on mobile */}
          <div className="space-y-3 md:hidden">
            {rows.map((a) => (
              <Link key={a.id} href={`/dashboard/appointees/${a.id}`} className="card block p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.name} photoUrl={a.photoUrl} size={44} />
                    <div>
                      <p className="font-medium text-ink">{a.name}</p>
                      <p className="text-sm text-ink/60">{a.position}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-xs text-ink/50">{a.reference} · {a.phone ?? "No phone"}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
