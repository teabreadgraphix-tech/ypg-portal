import { NextRequest, NextResponse } from "next/server";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { youthMps } from "@/db/schema";
import { uploadFile } from "@/lib/storage";

export const maxDuration = 60;

const CATCHUP_FORM_ID = "Nperbp";

type Answer = string | string[] | { id: string; name: string; url: string }[] | undefined;
type TallyQuestion = { id: string; type: string; title?: string };
type TallySubmission = { id: string; isCompleted: boolean; responses: { questionId: string; answer: Answer }[] };

function extract(answer: Answer): string | { name: string; url: string } | undefined {
  if (Array.isArray(answer)) {
    if (answer.length === 0) return undefined;
    const first = answer[0];
    if (typeof first === "object") return { name: first.name, url: first.url };
    return first;
  }
  return answer;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect ?key= value." }, { status: 401 });
  }
  const apiKey = process.env.TALLY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "TALLY_API_KEY is not set." }, { status: 500 });

  const res = await fetch(`https://api.tally.so/forms/${CATCHUP_FORM_ID}/submissions?page=1&limit=200`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Tally API error: HTTP ${res.status}` }, { status: 502 });
  }
  const data = await res.json();
  const questions: TallyQuestion[] = data.questions; // order: fullName, email, photo
  const submissions: TallySubmission[] = (data.submissions as TallySubmission[]).filter((s) => s.isCompleted);

  const fieldByQid = new Map<string, "fullName" | "email" | "photo">();
  const fieldOrder = ["fullName", "email", "photo"] as const;
  questions.forEach((q, i) => fieldByQid.set(q.id, fieldOrder[i]));

  const results: { input: string; outcome: string }[] = [];

  for (const sub of submissions) {
    const answers: Record<string, string | { name: string; url: string }> = {};
    for (const r of sub.responses) {
      const field = fieldByQid.get(r.questionId);
      if (!field) continue;
      const val = extract(r.answer);
      if (val !== undefined) answers[field] = val;
    }

    const name = (answers.fullName as string) || "";
    const email = ((answers.email as string) || "").trim().toLowerCase();
    const photo = answers.photo as { name: string; url: string } | undefined;
    const label = name || email || sub.id;

    if (!photo?.url) {
      results.push({ input: label, outcome: "skipped: no photo attached" });
      continue;
    }

    let match;
    if (email) {
      [match] = await db.select().from(youthMps).where(eq(youthMps.email, email)).limit(1);
    }
    if (!match && name) {
      [match] = await db.select().from(youthMps).where(eq(youthMps.fullName, name.trim())).limit(1);
    }
    if (!match) {
      results.push({ input: label, outcome: "skipped: no matching Youth MP record found (check name/email spelling)" });
      continue;
    }
    if (match.photoUrl) {
      results.push({ input: label, outcome: `skipped: ${match.fullName} already has a photo` });
      continue;
    }

    try {
      const fileRes = await fetch(photo.url);
      if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const contentType = fileRes.headers.get("content-type") || "image/jpeg";
      const blobUrl = await uploadFile(buffer, photo.name || `${match.fullName}.jpg`, contentType);
      await db.update(youthMps).set({ photoUrl: blobUrl }).where(eq(youthMps.id, match.id));
      results.push({ input: label, outcome: `uploaded for ${match.fullName}` });
    } catch (err) {
      results.push({ input: label, outcome: `failed: ${String(err)}` });
    }
  }

  const stillMissing = await db.select({ id: youthMps.id }).from(youthMps).where(isNull(youthMps.photoUrl));

  return NextResponse.json({ ok: true, results, youthMpsStillWithoutPhoto: stillMissing.length });
}
