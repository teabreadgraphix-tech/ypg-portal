import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { proposals, activityLogs, youthMps, constituencies, regions, categories } from "@/db/schema";
import { getSession, canReview } from "@/lib/auth";

async function loadProposal(id: number) {
  const [row] = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const record = await loadProposal(id);
  if (!record) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  if (session.role === "youth_mp" && record.submittedById !== session.userId) {
    return NextResponse.json({ error: "You can only view your own proposals." }, { status: 403 });
  }

  const [enriched] = await db
    .select({
      youthMpName: youthMps.fullName,
      constituencyName: constituencies.name,
      regionName: regions.name,
      categoryName: categories.name,
    })
    .from(proposals)
    .leftJoin(youthMps, eq(proposals.youthMpId, youthMps.id))
    .leftJoin(constituencies, eq(proposals.constituencyId, constituencies.id))
    .leftJoin(regions, eq(proposals.regionId, regions.id))
    .leftJoin(categories, eq(proposals.categoryId, categories.id))
    .where(eq(proposals.id, id))
    .limit(1);

  return NextResponse.json({ ...record, ...enriched });
}

const EDITABLE_FIELDS = [
  "title", "categoryId", "problemStatement", "background", "objectives", "beneficiaries",
  "activities", "expectedOutcomes", "methodology", "location", "startDate", "endDate",
  "budget", "fundingSource", "partners", "sustainabilityPlan", "mePlan",
] as const;

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  categoryId: z.number().int().optional().nullable(),
  problemStatement: z.string().optional(),
  background: z.string().optional(),
  objectives: z.string().optional(),
  beneficiaries: z.string().optional(),
  activities: z.string().optional(),
  expectedOutcomes: z.string().optional(),
  methodology: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  fundingSource: z.string().optional(),
  partners: z.string().optional(),
  sustainabilityPlan: z.string().optional(),
  mePlan: z.string().optional(),
  resubmit: z.boolean().optional(),
  status: z.enum(["Ongoing", "Completed"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const record = await loadProposal(id);
  if (!record) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  const isOwner = record.submittedById === session.userId;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;

  if (input.status && !canReview(session.role)) {
    return NextResponse.json({ error: "Only an admin can change a proposal's lifecycle status." }, { status: 403 });
  }

  const editingContent = EDITABLE_FIELDS.some((f) => f in input);
  if (editingContent) {
    if (!isOwner && !canReview(session.role)) {
      return NextResponse.json({ error: "You can only edit your own proposals." }, { status: 403 });
    }
    if (isOwner && !canReview(session.role) && !["Draft", "Revision Required"].includes(record.status)) {
      return NextResponse.json({ error: "This proposal can no longer be edited at its current status." }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of EDITABLE_FIELDS) if (f in input) updates[f] = (input as Record<string, unknown>)[f];
  if (input.status) updates.status = input.status;
  if (input.resubmit && record.status === "Revision Required") {
    updates.status = "Submitted";
    updates.submittedAt = new Date();
  }

  const [updated] = await db.update(proposals).set(updates).where(eq(proposals.id, id)).returning();

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: input.resubmit ? "resubmitted" : "updated",
    entityType: "proposal",
    entityId: id,
    reference: record.reference,
    details: `${session.fullName} ${input.resubmit ? "resubmitted" : "updated"} proposal "${record.title}" (${record.reference}).`,
  });

  return NextResponse.json(updated);
}
