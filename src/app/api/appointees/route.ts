import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db, generateReference } from "@/db";
import { appointees, activityLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const constituencyId = searchParams.get("constituencyId");
  const regionId = searchParams.get("regionId");

  const conditions = [eq(appointees.isArchived, false)];
  if (status) conditions.push(eq(appointees.status, status as (typeof appointees.status.enumValues)[number]));
  if (constituencyId) conditions.push(eq(appointees.constituencyId, Number(constituencyId)));
  if (regionId) conditions.push(eq(appointees.regionId, Number(regionId)));

  // Youth MPs only ever see their own submissions.
  const youthMpFilter =
    session.role === "youth_mp" ? eq(appointees.submittedById, session.userId) : undefined;

  const searchClause = search
    ? or(
        ilike(appointees.name, `%${search}%`),
        ilike(appointees.position, `%${search}%`),
        ilike(appointees.phone, `%${search}%`),
        ilike(appointees.email, `%${search}%`),
        ilike(appointees.reference, `%${search}%`),
      )
    : undefined;

  const rows = await db
    .select()
    .from(appointees)
    .where(and(...conditions, youthMpFilter, searchClause))
    .orderBy(desc(appointees.submittedAt));

  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(2, "Name is required."),
  gender: z.string().optional(),
  dob: z.string().optional(),
  position: z.string().min(2, "Position is required."),
  categoryId: z.number().int().optional().nullable(),
  constituencyId: z.number().int(),
  regionId: z.number().int(),
  appointingYouthMpId: z.number().int(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  institution: z.string().optional(),
  occupation: z.string().optional(),
  dateAppointed: z.string().optional(),
  bio: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const input = parsed.data;

  const reference = await generateReference("APP");

  const [created] = await db
    .insert(appointees)
    .values({
      reference,
      name: input.name,
      gender: input.gender || null,
      dob: input.dob || null,
      position: input.position,
      categoryId: input.categoryId ?? null,
      constituencyId: input.constituencyId,
      regionId: input.regionId,
      appointingYouthMpId: input.appointingYouthMpId,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      email: input.email || null,
      institution: input.institution || null,
      occupation: input.occupation || null,
      dateAppointed: input.dateAppointed || null,
      bio: input.bio || null,
      notes: input.notes || null,
      photoUrl: input.photoUrl || null,
      submittedById: session.userId,
    })
    .returning();

  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "created",
    entityType: "appointee",
    entityId: created.id,
    reference: created.reference,
    details: `${session.fullName} submitted appointee "${created.name}" (${created.reference}).`,
  });

  return NextResponse.json(created, { status: 201 });
}
