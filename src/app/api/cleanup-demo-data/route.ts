import { NextRequest, NextResponse } from "next/server";
import { like } from "drizzle-orm";
import { db } from "@/db";
import { proposals, projects, letters, actionPlans } from "@/db/schema";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect ?key= value." }, { status: 401 });
  }

  const deletedProposals = await db.delete(proposals).where(like(proposals.reference, "%-DEMO%")).returning({ reference: proposals.reference });
  const deletedProjects = await db.delete(projects).where(like(projects.reference, "%-DEMO%")).returning({ reference: projects.reference });
  const deletedLetters = await db.delete(letters).where(like(letters.reference, "%-DEMO%")).returning({ reference: letters.reference });
  const deletedActionPlans = await db.delete(actionPlans).where(like(actionPlans.reference, "%-DEMO%")).returning({ reference: actionPlans.reference });

  return NextResponse.json({
    ok: true,
    deletedProposals: deletedProposals.length,
    deletedProjects: deletedProjects.length,
    deletedLetters: deletedLetters.length,
    deletedActionPlans: deletedActionPlans.length,
  });
}
