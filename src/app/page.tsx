import Link from "next/link";
import Image from "next/image";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { youthMps, constituencies, regions, appointees } from "@/db/schema";
import { PublicHeader, PublicFooter } from "@/components/public-header";
import { Avatar } from "@/components/avatar";

async function getStats() {
  const [[mp], [app], [reg]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(youthMps),
    db.select({ count: sql<number>`count(*)::int` }).from(appointees).where(sql`${appointees.isArchived} = false`),
    db.select({ count: sql<number>`count(distinct ${youthMps.regionId})::int` }).from(youthMps),
  ]);
  return { youthMps: mp.count, appointees: app.count, regionsCovered: reg.count };
}

async function getFeaturedMps() {
  return db
    .select({
      id: youthMps.id,
      fullName: youthMps.fullName,
      photoUrl: youthMps.photoUrl,
      constituency: constituencies.name,
      region: regions.name,
    })
    .from(youthMps)
    .innerJoin(constituencies, eq(youthMps.constituencyId, constituencies.id))
    .innerJoin(regions, eq(youthMps.regionId, regions.id))
    .orderBy(youthMps.id)
    .limit(8);
}

export default async function PublicHomePage() {
  const [stats, featured] = await Promise.all([getStats(), getFeaturedMps()]);

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader active="/" />

      <section className="relative overflow-hidden bg-forest-950">
        <Image src="/parliament-bg.jpg" alt="" fill priority className="object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 via-forest-950/90 to-forest-950" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <Image src="/logo.png" alt="" width={96} height={96} className="mx-auto mb-6 drop-shadow-lg" />
          <h1 className="font-serif text-3xl font-semibold text-paper sm:text-4xl">Youth Parliament Ghana</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gold-200">
            Office of Programmes, Projects &amp; Logistics — connecting Youth MPs, their appointed executive
            teams, and the communities they serve across all regions of Ghana.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/mps" className="btn-primary !bg-gold-500 !text-forest-950 hover:!bg-gold-400">
              Meet the Youth MPs
            </Link>
            <Link href="/appointees" className="rounded border border-paper/30 px-4 py-2.5 text-sm font-medium text-paper hover:bg-paper/10">
              View Appointees
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard value={stats.youthMps} label="Youth MPs Registered" />
          <StatCard value={stats.appointees} label="Appointees Serving" />
          <StatCard value={stats.regionsCovered} label="Regions Represented" />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-ink">Youth MPs</h2>
            <Link href="/mps" className="text-sm text-forest-800 underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featured.map((mp) => (
              <div key={mp.id} className="card flex flex-col items-center p-5 text-center">
                <Avatar name={mp.fullName} photoUrl={mp.photoUrl} size={72} />
                <p className="mt-3 text-sm font-medium text-ink">{mp.fullName}</p>
                <p className="text-xs text-ink/60">{mp.constituency}</p>
                <p className="text-xs text-ink/40">{mp.region}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="card p-6 text-center">
      <p className="font-serif text-3xl font-semibold text-forest-800">{value}</p>
      <p className="mt-1 text-sm text-ink/60">{label}</p>
    </div>
  );
}
