import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { proposals, comments, activityLogs } from "@/db/schema";
import { getSession, canReview } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(comments)
    .where(and(eq(comments.parentType, "proposal"), eq(comments.parentId, Number(params.id))))
    .orderBy(asc(comments.createdAt));
  return NextResponse.json(rows);
}

const bodySchema = z.object({
  action: z.enum(["comment", "approved", "rejected", "revision_requested"]),
  body: z.string().min(1, "A comment is required."),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { action, body } = parsed.data;

  if (action !== "comment" && !canReview(session.role)) {
    return NextResponse.json({ error: "Only an admin can approve, reject, or request revision." }, { status: 403 });
  }

  const [created] = await db
    .insert(comments)
    .values({ parentType: "proposal", parentId: id, authorId: session.userId, action, body })
    .returning();

  const statusByAction: Record<string, (typeof proposals.status.enumValues)[number] | undefined> = {
    approved: "Approved",
    rejected: "Rejected",
    revision_requested: "Revision Required",
  };
  const newStatus = statusByAction[action];
  if (newStatus) {
    await db.update(proposals).set({ status: newStatus, updatedAt: new Date() }).where(eq(proposals.id, id));
  }

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: action === "comment" ? "commented" : action,
    entityType: "proposal",
    entityId: id,
    reference: proposal.reference,
    details: `${session.fullName} ${
      action === "comment" ? "commented on" : action === "approved" ? "approved" : action === "rejected" ? "rejected" : "requested revision on"
    } proposal "${proposal.title}" (${proposal.reference}).`,
  });

  return NextResponse.json(created, { status: 201 });
}
