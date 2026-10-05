"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicHeader, PublicFooter } from "@/components/public-header";
import { Avatar } from "@/components/avatar";

type Mp = { id: number; fullName: string; photoUrl: string | null; constituency: string; region: string };

export default function MpsDirectoryPage() {
  const [rows, setRows] = useState<Mp[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/youth-mps")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.constituency.toLowerCase().includes(q) || m.region.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const byRegion = useMemo(() => {
    const map = new Map<string, Mp[]>();
    for (const m of filtered) {
      if (!map.has(m.region)) map.set(m.region, []);
      map.get(m.region)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="/mps" />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold text-ink">Youth MPs</h1>
        <p className="mt-1 text-sm text-ink/60">Elected Youth MPs representing constituencies across Ghana.</p>

        <input
          className="field-input mt-6 max-w-sm"
          placeholder="Search by name, constituency, or region…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="mt-8 text-sm text-ink/60">Loading…</p>
        ) : byRegion.length === 0 ? (
          <p className="mt-8 text-sm text-ink/60">No Youth MPs match your search.</p>
        ) : (
          byRegion.map(([region, mps]) => (
            <div key={region} className="mt-10">
              <h2 className="mb-4 border-b border-gold-500/40 pb-2 font-serif text-lg font-semibold text-forest-800">
                {region} <span className="text-sm font-normal text-ink/50">({mps.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {mps.map((m) => (
                  <div key={m.id} className="card flex flex-col items-center p-5 text-center">
                    <Avatar name={m.fullName} photoUrl={m.photoUrl} size={72} />
                    <p className="mt-3 text-sm font-medium text-ink">{m.fullName}</p>
                    <p className="text-xs text-ink/60">{m.constituency}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
      <PublicFooter />
    </div>
  );
}
