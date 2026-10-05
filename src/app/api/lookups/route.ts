import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { regions, constituencies, categories, youthMps } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [regionRows, constituencyRows, appointmentCategories, projectCategories, letterCategories, youthMpRows] = await Promise.all([
    db.select().from(regions).orderBy(regions.name),
    db.select().from(constituencies).orderBy(constituencies.name),
    db.select().from(categories).where(eq(categories.type, "appointment")),
    db.select().from(categories).where(eq(categories.type, "project")),
    db.select().from(categories).where(eq(categories.type, "letter")),
    db
      .select({
        id: youthMps.id,
        fullName: youthMps.fullName,
        constituencyId: youthMps.constituencyId,
        regionId: youthMps.regionId,
      })
      .from(youthMps),
  ]);

  return NextResponse.json({
    regions: regionRows,
    constituencies: constituencyRows,
    appointmentCategories,
    projectCategories,
    letterCategories,
    youthMps: youthMpRows,
  });
}
