import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projects, proposals, youthMps, constituencies, regions, activityLogs } from "@/db/schema";
import { getSession, canReview } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const [record] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!record) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const [enriched] = await db
    .select({
      youthMpName: youthMps.fullName,
      constituencyName: constituencies.name,
      regionName: regions.name,
      proposalReference: proposals.reference,
    })
    .from(projects)
    .leftJoin(youthMps, eq(projects.youthMpId, youthMps.id))
    .leftJoin(constituencies, eq(projects.constituencyId, constituencies.id))
    .leftJoin(regions, eq(projects.regionId, regions.id))
    .leftJoin(proposals, eq(projects.proposalId, proposals.id))
    .where(eq(projects.id, id))
    .limit(1);

  return NextResponse.json({ ...record, ...enriched });
}

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  status: z.enum(["Planned", "Approved", "Ongoing", "Suspended", "Completed", "Archived"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  fundingSource: z.string().optional(),
  beneficiaries: z.string().optional(),
  location: z.string().optional(),
  objectives: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canReview(session.role)) {
    return NextResponse.json({ error: "Only an admin can update projects." }, { status: 403 });
  }

  const id = Number(params.id);
  const [record] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!record) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const [updated] = await db
    .update(projects)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: parsed.data.status ? "status_changed" : "updated",
    entityType: "project",
    entityId: id,
    reference: record.reference,
    details: parsed.data.status
      ? `${session.fullName} changed status of project "${record.name}" (${record.reference}) to ${parsed.data.status}.`
      : `${session.fullName} updated project "${record.name}" (${record.reference}).`,
  });

  return NextResponse.json(updated);
}
