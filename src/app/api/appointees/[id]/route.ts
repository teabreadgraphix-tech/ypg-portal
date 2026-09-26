import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointees, activityLogs } from "@/db/schema";
import { getSession, canReview } from "@/lib/auth";

async function loadAppointee(id: number) {
  const [row] = await db.select().from(appointees).where(eq(appointees.id, id)).limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await loadAppointee(Number(params.id));
  if (!record) return NextResponse.json({ error: "Appointee not found." }, { status: 404 });

  if (session.role === "youth_mp" && record.submittedById !== session.userId) {
    return NextResponse.json({ error: "You can only view your own submissions." }, { status: 403 });
  }
  return NextResponse.json(record);
}

const updateSchema = z.object({
  status: z.enum(["Pending", "Active", "Inactive", "Resigned", "Removed"]).optional(),
  isArchived: z.boolean().optional(),
  name: z.string().min(2).optional(),
  position: z.string().min(2).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  institution: z.string().optional(),
  occupation: z.string().optional(),
  bio: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const record = await loadAppointee(id);
  if (!record) return NextResponse.json({ error: "Appointee not found." }, { status: 404 });

  const isOwner = record.submittedById === session.userId;
  if (session.role === "youth_mp" && !isOwner) {
    return NextResponse.json({ error: "You can only edit your own submissions." }, { status: 403 });
  }
  // Only the Deputy Project Manager / Super Admin can change status or archive.
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;
  if ((input.status !== undefined || input.isArchived !== undefined) && !canReview(session.role)) {
    return NextResponse.json({ error: "Only an admin can change status or archive a record." }, { status: 403 });
  }

  const [updated] = await db
    .update(appointees)
    .set({ ...input, email: input.email || undefined, updatedAt: new Date() })
    .where(eq(appointees.id, id))
    .returning();

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: input.status ? "status_changed" : "updated",
    entityType: "appointee",
    entityId: id,
    reference: record.reference,
    details: input.status
      ? `${session.fullName} changed status of "${record.name}" (${record.reference}) to ${input.status}.`
      : `${session.fullName} updated appointee "${record.name}" (${record.reference}).`,
  });

  return NextResponse.json(updated);
}
