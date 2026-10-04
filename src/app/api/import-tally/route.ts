import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, generateReference } from "@/db";
import { regions, constituencies, youthMps, appointees, users, documents } from "@/db/schema";
import { uploadFile } from "@/lib/storage";

export const maxDuration = 60;

const TALLY_FORM_ID = "dWrXrd";
const BATCH_SIZE = 5; // new Youth MPs to process per visit to this URL

const MP_FIELDS = ["fullName", "gender", "region", "constituency", "phone", "whatsapp", "email", "photo"] as const;
const MP_FIELD_COUNT = MP_FIELDS.length;
const POS_FIELDS = [
  "fullName", "gender", "dob", "phone", "whatsapp", "email", "institution", "occupation", "dateAppointed", "photo",
] as const;
const POSITIONS = [
  "Chairman / Constituency Coordinator",
  "Secretary",
  "Treasurer",
  "Organizer",
  "Women's Organizer",
  "Communications Officer / PRO",
  "Research & Programs Officer",
] as const;

type Answer = string | string[] | { id: string; name: string; url: string }[] | undefined;
type TallyQuestion = { id: string; type: string };
type TallySubmission = { id: string; isCompleted: boolean; submittedAt: string; responses: { questionId: string; answer: Answer }[] };

function extract(answer: Answer): string | { name: string; url: string } | undefined {
  if (Array.isArray(answer)) {
    if (answer.length === 0) return undefined;
    const first = answer[0];
    if (typeof first === "object") return { name: first.name, url: first.url };
    return first;
  }
  return answer;
}

async function fetchAllSubmissions(): Promise<{ questions: TallyQuestion[]; submissions: TallySubmission[] }> {
  const apiKey = process.env.TALLY_API_KEY;
  if (!apiKey) throw new Error("TALLY_API_KEY is not set.");

  let page = 1;
  let allSubmissions: TallySubmission[] = [];
  let questions: TallyQuestion[] = [];
  for (;;) {
    const res = await fetch(`https://api.tally.so/forms/${TALLY_FORM_ID}/submissions?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Tally API error: HTTP ${res.status}`);
    const data = await res.json();
    questions = data.questions;
    allSubmissions = allSubmissions.concat(data.submissions);
    if (!data.hasMore) break;
    page++;
  }
  return { questions, submissions: allSubmissions.filter((s) => s.isCompleted) };
}

function parseSubmission(questions: TallyQuestion[], sub: TallySubmission) {
  const qidRole = new Map<string, [string, string]>();
  questions.slice(0, MP_FIELD_COUNT).forEach((q, i) => qidRole.set(q.id, ["mp", MP_FIELDS[i]]));
  for (let p = 0; p < 7; p++) {
    const chunk = questions.slice(MP_FIELD_COUNT + p * 10, MP_FIELD_COUNT + p * 10 + 10);
    chunk.forEach((q, i) => qidRole.set(q.id, [`pos${p}`, POS_FIELDS[i]]));
  }

  const mp: Record<string, string | { name: string; url: string }> = {};
  const positions: Record<string, string | { name: string; url: string }>[] = Array.from({ length: 7 }, () => ({}));

  for (const r of sub.responses) {
    const role = qidRole.get(r.questionId);
    if (!role) continue;
    const [group, field] = role;
    const val = extract(r.answer);
    if (val === undefined) continue;
    if (group === "mp") mp[field] = val;
    else positions[Number(group.slice(3))][field] = val;
  }
  return { id: sub.id, submittedAt: sub.submittedAt, mp, positions };
}

async function findOrCreateRegion(name: string) {
  const [existing] = await db.select().from(regions).where(eq(regions.name, name)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(regions).values({ name }).returning();
  return created;
}

async function findOrCreateConstituency(name: string, regionId: number) {
  const [existing] = await db
    .select()
    .from(constituencies)
    .where(and(eq(constituencies.name, name), eq(constituencies.regionId, regionId)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(constituencies).values({ name, regionId }).returning();
  return created;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect ?key= value." }, { status: 401 });
  }

  const [admin] = await db.select().from(users).where(eq(users.email, "admin@ypg.gov.gh")).limit(1);
  if (!admin) {
    return NextResponse.json({ error: "admin@ypg.gov.gh not found — run /api/setup first." }, { status: 400 });
  }

  const { questions, submissions } = await fetchAllSubmissions();
  const parsed = submissions.map((s) => parseSubmission(questions, s));

  const latestByEmail = new Map<string, (typeof parsed)[number]>();
  for (const p of parsed) {
    const email = ((p.mp.email as string) || "").trim().toLowerCase();
    if (!email) continue;
    const existing = latestByEmail.get(email);
    if (!existing || new Date(p.submittedAt) > new Date(existing.submittedAt)) {
      latestByEmail.set(email, p);
    }
  }
  const supersededCount = parsed.length - latestByEmail.size;

  const processed: { mpName: string; appointees: string[] }[] = [];
  const skippedAlready: string[] = [];
  const flaggedDobs: string[] = [];
  let newCount = 0;

  for (const sub of latestByEmail.values()) {
    const email = ((sub.mp.email as string) || "").trim().toLowerCase();
    const mpName = (sub.mp.fullName as string) || email;
    const [existingMp] = await db.select().from(youthMps).where(eq(youthMps.email, email)).limit(1);
    if (existingMp) {
      skippedAlready.push(mpName);
      continue;
    }
    if (newCount >= BATCH_SIZE) continue;

    const region = await findOrCreateRegion(((sub.mp.region as string) || "Unspecified").trim());
    const constituency = await findOrCreateConstituency(((sub.mp.constituency as string) || "Unspecified").trim(), region.id);

    const [youthMp] = await db
      .insert(youthMps)
      .values({
        fullName: ((sub.mp.fullName as string) || "Unknown").trim(),
        gender: sub.mp.gender as string,
        phone: sub.mp.phone as string,
        whatsapp: sub.mp.whatsapp as string,
        email,
        constituencyId: constituency.id,
        regionId: region.id,
      })
      .returning();

    const mpPhoto = sub.mp.photo as { name: string; url: string } | undefined;
    if (mpPhoto?.url) {
      try {
        const res = await fetch(mpPhoto.url);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const contentType = res.headers.get("content-type") || "image/jpeg";
          const blobUrl = await uploadFile(buffer, mpPhoto.name || `${youthMp.fullName}.jpg`, contentType);
          await db.update(youthMps).set({ photoUrl: blobUrl }).where(eq(youthMps.id, youthMp.id));
        }
      } catch {
        // Non-fatal; can be retried via the dedicated catch-up form/import later.
      }
    }

    const appointeeNames: string[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 7; i++) {
      const a = sub.positions[i];
      const name = (a.fullName as string) || `(unnamed ${POSITIONS[i]})`;
      if (!a.fullName) continue;

      const reference = await generateReference("APP");
      const dob = (a.dob as string) || null;
      if (dob && dob > today) flaggedDobs.push(`${reference} ${name}: DOB ${dob} is in the future`);

      const [created] = await db
        .insert(appointees)
        .values({
          reference,
          name: name.trim(),
          gender: a.gender as string,
          dob,
          position: POSITIONS[i],
          constituencyId: constituency.id,
          regionId: region.id,
          appointingYouthMpId: youthMp.id,
          phone: a.phone as string,
          whatsapp: a.whatsapp as string,
          email: a.email as string,
          institution: a.institution as string,
          occupation: a.occupation as string,
          dateAppointed: (a.dateAppointed as string) || null,
          submittedById: admin.id,
        })
        .returning();

      const photo = a.photo as { name: string; url: string } | undefined;
      if (photo?.url) {
        try {
          const res = await fetch(photo.url);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            const contentType = res.headers.get("content-type") || "image/jpeg";
            const blobUrl = await uploadFile(buffer, photo.name || `${name}.jpg`, contentType);
            await db.insert(documents).values({
              parentType: "appointee",
              parentId: created.id,
              filename: blobUrl.split("/").pop() ?? photo.name,
              originalFilename: photo.name || `${name}.jpg`,
              mimeType: contentType,
              sizeBytes: buffer.length,
              blobUrl,
              uploadedById: admin.id,
            });
          }
        } catch {
          // Photo failure doesn't block the record; it can be retried later.
        }
      }
      appointeeNames.push(`${reference} ${name}`);
    }

    processed.push({ mpName: youthMp.fullName, appointees: appointeeNames });
    newCount++;
  }

  const remaining = latestByEmail.size - skippedAlready.length - processed.length;

  return NextResponse.json({
    ok: true,
    totalSubmissionsOnTally: submissions.length,
    supersededResubmissionsSkipped: supersededCount,
    alreadyImportedSkipped: skippedAlready.length,
    processedThisRun: processed,
    remainingToProcess: remaining,
    hint: remaining > 0 ? "Visit this same link again to continue with the next batch." : "All caught up — nothing left to import.",
    flaggedForReview: flaggedDobs,
  });
}
