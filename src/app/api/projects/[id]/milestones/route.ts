import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projectMilestones, projects, activityLogs } from "@/db/schema";
import { getSession, canReview } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, Number(params.id)))
    .orderBy(asc(projectMilestones.dueDate));
  return NextResponse.json(rows);
}

const createSchema = z.object({
  title: z.string().min(2, "Title is required."),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canReview(session.role)) {
    return NextResponse.json({ error: "Only an admin can add milestones." }, { status: 403 });
  }

  const projectId = Number(params.id);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const [created] = await db
    .insert(projectMilestones)
    .values({
      projectId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate: parsed.data.dueDate || null,
    })
    .returning();

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "milestone_added",
    entityType: "project",
    entityId: projectId,
    reference: project.reference,
    details: `${session.fullName} added milestone "${created.title}" to project "${project.name}" (${project.reference}).`,
  });

  return NextResponse.json(created, { status: 201 });
}
