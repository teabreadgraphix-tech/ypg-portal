import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db, generateReference } from "@/db";
import { projects, proposals, activityLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");

  const conditions = [];
  if (status) conditions.push(eq(projects.status, status as (typeof projects.status.enumValues)[number]));
  const searchClause = search
    ? or(ilike(projects.name, `%${search}%`), ilike(projects.reference, `%${search}%`))
    : undefined;

  const rows = await db
    .select()
    .from(projects)
    .where(and(...conditions, searchClause))
    .orderBy(desc(projects.updatedAt));

  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(3, "Name is required."),
  proposalId: z.number().int().optional().nullable(),
  youthMpId: z.number().int(),
  constituencyId: z.number().int(),
  regionId: z.number().int(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  fundingSource: z.string().optional(),
  beneficiaries: z.string().optional(),
  location: z.string().optional(),
  objectives: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;

  if (input.proposalId) {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, input.proposalId)).limit(1);
    if (!proposal || proposal.status !== "Approved") {
      return NextResponse.json({ error: "A project can only be created from an Approved proposal." }, { status: 400 });
    }
  }

  const reference = await generateReference("PRJ");
  const [created] = await db
    .insert(projects)
    .values({
      reference,
      name: input.name,
      proposalId: input.proposalId ?? null,
      youthMpId: input.youthMpId,
      constituencyId: input.constituencyId,
      regionId: input.regionId,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      budget: input.budget || null,
      fundingSource: input.fundingSource || null,
      beneficiaries: input.beneficiaries || null,
      location: input.location || null,
      objectives: input.objectives || null,
      status: "Planned",
    })
    .returning();

  if (input.proposalId) {
    await db.update(proposals).set({ status: "Ongoing" }).where(eq(proposals.id, input.proposalId));
  }

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "created",
    entityType: "project",
    entityId: created.id,
    reference: created.reference,
    details: `${session.fullName} created project "${created.name}" (${created.reference})${input.proposalId ? " from an approved proposal" : ""}.`,
  });

  return NextResponse.json(created, { status: 201 });
}
