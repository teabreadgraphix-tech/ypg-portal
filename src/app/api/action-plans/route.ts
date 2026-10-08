import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db, generateReference } from "@/db";
import { actionPlans, activityLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const conditions = [];
  if (status) conditions.push(eq(actionPlans.status, status as (typeof actionPlans.status.enumValues)[number]));
  if (priority) conditions.push(eq(actionPlans.priority, priority as (typeof actionPlans.priority.enumValues)[number]));
  const searchClause = search
    ? or(ilike(actionPlans.actionItem, `%${search}%`), ilike(actionPlans.reference, `%${search}%`))
    : undefined;

  const rows = await db
    .select()
    .from(actionPlans)
    .where(and(...conditions, searchClause))
    .orderBy(desc(actionPlans.updatedAt));

  return NextResponse.json(rows);
}

const createSchema = z.object({
  actionItem: z.string().min(3, "Action item is required."),
  objective: z.string().optional(),
  responsibleYouthMpId: z.number().int().optional().nullable(),
  department: z.string().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;
  const reference = await generateReference("ACT");

  const [created] = await db
    .insert(actionPlans)
    .values({
      reference,
      actionItem: input.actionItem,
      objective: input.objective || null,
      responsibleYouthMpId: input.responsibleYouthMpId ?? null,
      department: input.department || null,
      startDate: input.startDate || null,
      deadline: input.deadline || null,
      priority: input.priority ?? "Medium",
      notes: input.notes || null,
      status: "Pending",
      progress: 0,
      createdById: session.userId,
    })
    .returning();

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "created",
    entityType: "action_plan",
    entityId: created.id,
    reference: created.reference,
    details: `${session.fullName} created action plan "${created.actionItem}" (${created.reference}).`,
  });

  return NextResponse.json(created, { status: 201 });
}
