import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projectMilestones } from "@/db/schema";
import { getSession, canReview } from "@/lib/auth";

const updateSchema = z.object({
  status: z.enum(["Pending", "In Progress", "Completed", "Delayed"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canReview(session.role)) {
    return NextResponse.json({ error: "Only an admin can update milestones." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const [updated] = await db
    .update(projectMilestones)
    .set({
      status: parsed.data.status,
      completedAt: parsed.data.status === "Completed" ? new Date() : null,
    })
    .where(eq(projectMilestones.id, Number(params.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
  return NextResponse.json(updated);
}
