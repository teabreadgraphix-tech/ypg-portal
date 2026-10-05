import { NextResponse } from "next/server";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { appointees, constituencies, regions, documents } from "@/db/schema";

export async function GET() {
  const rows = await db
    .select({
      id: appointees.id,
      name: appointees.name,
      position: appointees.position,
      status: appointees.status,
      constituency: constituencies.name,
      region: regions.name,
    })
    .from(appointees)
    .innerJoin(constituencies, eq(appointees.constituencyId, constituencies.id))
    .innerJoin(regions, eq(appointees.regionId, regions.id))
    .where(eq(appointees.isArchived, false))
    .orderBy(regions.name, constituencies.name, appointees.position);

  const ids = rows.map((r) => r.id);
  const photoByAppointeeId = new Map<number, string>();
  if (ids.length > 0) {
    const docs = await db
      .select({ parentId: documents.parentId, blobUrl: documents.blobUrl, mimeType: documents.mimeType })
      .from(documents)
      .where(and(eq(documents.parentType, "appointee"), inArray(documents.parentId, ids)));
    for (const d of docs) {
      if (d.mimeType.startsWith("image/") && !photoByAppointeeId.has(d.parentId)) {
        photoByAppointeeId.set(d.parentId, d.blobUrl);
      }
    }
  }

  return NextResponse.json(rows.map((r) => ({ ...r, photoUrl: photoByAppointeeId.get(r.id) ?? null })));
}
