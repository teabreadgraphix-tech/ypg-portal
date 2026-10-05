"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicHeader, PublicFooter } from "@/components/public-header";
import { Avatar } from "@/components/avatar";

type Appointee = {
  id: number; name: string; position: string; status: string;
  constituency: string; region: string; photoUrl: string | null;
};

const POSITIONS = [
  "Chairman / Constituency Coordinator",
  "Secretary",
  "Treasurer",
  "Organizer",
  "Women's Organizer",
  "Communications Officer / PRO",
  "Research & Programs Officer",
];

export default function AppointeesDirectoryPage() {
  const [rows, setRows] = useState<Appointee[]>([]);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/appointees")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (position && a.position !== position) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.constituency.toLowerCase().includes(q) || a.region.toLowerCase().includes(q);
    });
  }, [rows, search, position]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="/appointees" />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold text-ink">Appointees</h1>
        <p className="mt-1 text-sm text-ink/60">The 7-member executive team appointed by each Youth MP.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            className="field-input max-w-sm"
            placeholder="Search by name, constituency, or region…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="field-input max-w-xs" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">All positions</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-ink/60">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-sm text-ink/60">No appointees match your search.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((a) => (
              <div key={a.id} className="card flex flex-col items-center p-5 text-center">
                <Avatar name={a.name} photoUrl={a.photoUrl} size={72} />
                <p className="mt-3 text-sm font-medium text-ink">{a.name}</p>
                <p className="text-xs text-forest-800">{a.position}</p>
                <p className="text-xs text-ink/50">{a.constituency}, {a.region}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <PublicFooter />
    </div>
  );
}
