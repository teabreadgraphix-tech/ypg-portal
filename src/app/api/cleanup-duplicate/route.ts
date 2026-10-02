import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appointees, youthMps } from "@/db/schema";

const DUPLICATE_YOUTH_MP_ID = 7;
const DUPLICATE_APPOINTEE_REFS = [
  "YPG-APP-2026-0008",
  "YPG-APP-2026-0009",
  "YPG-APP-2026-0010",
  "YPG-APP-2026-0011",
  "YPG-APP-2026-0012",
  "YPG-APP-2026-0013",
  "YPG-APP-2026-0014",
];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect ?key= value." }, { status: 401 });
  }

  const deletedAppointees = await db
    .delete(appointees)
    .where(inArray(appointees.reference, DUPLICATE_APPOINTEE_REFS))
    .returning({ reference: appointees.reference });

  const deletedMp = await db
    .delete(youthMps)
    .where(eq(youthMps.id, DUPLICATE_YOUTH_MP_ID))
    .returning({ id: youthMps.id, name: youthMps.fullName });

  return NextResponse.json({ ok: true, deletedAppointees, deletedMp });
}
