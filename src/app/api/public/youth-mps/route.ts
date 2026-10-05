import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { youthMps, constituencies, regions } from "@/db/schema";

export async function GET() {
  const rows = await db
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
    .orderBy(regions.name, constituencies.name, youthMps.fullName);

  return NextResponse.json(rows);
}
