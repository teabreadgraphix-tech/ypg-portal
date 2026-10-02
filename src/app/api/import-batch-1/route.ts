import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, generateReference } from "@/db";
import { regions, constituencies, youthMps, appointees, users, documents } from "@/db/schema";
import { uploadFile } from "@/lib/storage";

const MP = {
  fullName: "Hon. Godwin Tetteh",
  gender: "Male",
  regionName: "Greater Accra",
  constituencyName: "Domeabra Obom",
  phone: "+233204628116",
  whatsapp: "+233204628116",
  email: "godwint970@gmail.com",
};

const POSITIONS = [
  "Chairman / Constituency Coordinator",
  "Secretary",
  "Treasurer",
  "Organizer",
  "Women's Organizer",
  "Communications Officer / PRO",
  "Research & Programs Officer",
] as const;

const APPOINTEES = [
  { fullName: "Agyeiwaa Sandra", gender: "Female", dob: "2005-08-01", phone: "+233531961196", whatsapp: "+233531961196", email: "agyeiwaa2025@gmail.com", institution: "Knust", occupation: "Student", dateAppointed: "2026-09-21", photoUrl: "https://storage.tally.so/private/IMG-20260926-WA0125.jpg?id=gPjb5M&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImdQamI1TSIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.nCdGetqw5jrYCrqgvA2mGBnFVoXk6PAY6hTVVkc_9Ew&signature=1065edbe48884355db60b8f1062a56724558e94c0c2e3b41b75028f49011a229" },
  { fullName: "Patricia Atsufui Afornu", gender: "Female", dob: "2004-12-31", phone: "+233545364048", whatsapp: "+233534514636", email: "godwint970@gmail.com", institution: "UEW", occupation: "Student", dateAppointed: "2026-09-22", photoUrl: "https://storage.tally.so/private/IMG-20260928-WA0005.jpg?id=v6Xd7D&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InY2WGQ3RCIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.QZw7tcXlMRHu5smA-eFcZnjwGrYJ6xCUKM9DGiC0aVc&signature=bc9c76d742764793a228ee78f13ea00fffeedc9ef12e47e5374755aaa54b1ca2" },
  { fullName: "Joshua Amevor Yao", gender: "Male", dob: "2000-07-06", phone: "+233242409595", whatsapp: "+233242409595", email: "godwint970@gmail.com", institution: "Ucc", occupation: "Student", dateAppointed: "2026-09-23", photoUrl: "https://storage.tally.so/private/IMG-20260926-WA0127-1-.jpg?id=zBXNMM&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InpCWE5NTSIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.zU0qP0MfWPQwQOnDVM92gdR3tz1fVD6TFn5LvlRPBJk&signature=35666bb48d9c6547e5d6b8e67ec419d6e4c121070d0116a73d7da5e76fbb9149" },
  { fullName: "Nathaniel Tagoe", gender: "Male", dob: "1998-07-06", phone: "+233550268028", whatsapp: "+233550268028", email: "nattagoe222@gmail.com", institution: "Ucc", occupation: "Teacher", dateAppointed: "2026-09-21", photoUrl: "https://storage.tally.so/private/IMG-20260927-WA0085.jpg?id=2d8BLV&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJkOEJMViIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.DoV1MHkmhnaa0VUjiFc5TQWxcDiWWdeGteWYrOoLnt0&signature=b42b149895607ed1334b81502f687c8e40aea6a09b722093645bd2876bbf837f" },
  { fullName: "Helena Fosu", gender: "Female", dob: "2002-08-22", phone: "+233599312440", whatsapp: "+233599312440", email: "hfosu199@gmail.com", institution: "Bridgewood Academy", occupation: "Teaching", dateAppointed: "2026-09-23", photoUrl: "https://storage.tally.so/private/IMG-20260928-WA0010.jpg?id=dGbvZV&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRHYnZaViIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.5h3WXbFuu7MNxyTvHYi94idM803H3RBqL-YL7YXaMK8&signature=a47e241b2250ee8374f769a9abbee18753f8d9982c84dd4c41982e2bba80e6ff" },
  { fullName: "Sampson Atsu Ahiatsi", gender: "Male", dob: "2000-09-27", phone: "+233541149877", whatsapp: "+233541149877", email: "godwint970@gmail.com", institution: "Ucc", occupation: "Student", dateAppointed: "2026-09-21", photoUrl: "https://storage.tally.so/private/IMG-20260927-WA0020-1-.jpg?id=qQ5vx5&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InFRNXZ4NSIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.RKqT0XsPfqKH0VcWvf4JRNh3G0JdZJxV1dBMIPoghZ4&signature=76140bf98dd39906ce016ebeef999382b8721da69bddd335794e4aa08ce473e1" },
  { fullName: "Joseph Nii Armah-Armah", gender: "Male", dob: "1983-02-27", phone: "+233592892129", whatsapp: "+233592892129", email: "armaharmahjoseph@gmail.com", institution: "School", occupation: "Teacher", dateAppointed: "2026-09-24", photoUrl: "https://storage.tally.so/private/IMG-20260929-WA0026.jpg?id=9091GV&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkwOTFHViIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.2-XgZN5q3IFd_T-1hQvBtD_iNTX8aF1ZLTxFDeOrdHY&signature=385b4d9b0047780bc82f55d111444f598aae9d0d87264be6f753d324352d0152" },
];

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

  const region = await findOrCreateRegion(MP.regionName);
  const constituency = await findOrCreateConstituency(MP.constituencyName, region.id);

  const [youthMp] = await db
    .insert(youthMps)
    .values({
      fullName: MP.fullName,
      gender: MP.gender,
      phone: MP.phone,
      whatsapp: MP.whatsapp,
      email: MP.email,
      constituencyId: constituency.id,
      regionId: region.id,
    })
    .returning();

  const createdAppointees: { position: string; reference: string; name: string; photoUploaded: boolean }[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < APPOINTEES.length; i++) {
    const a = APPOINTEES[i];
    const position = POSITIONS[i];
    const reference = await generateReference("APP");

    const [created] = await db
      .insert(appointees)
      .values({
        reference,
        name: a.fullName,
        gender: a.gender,
        dob: a.dob,
        position,
        constituencyId: constituency.id,
        regionId: region.id,
        appointingYouthMpId: youthMp.id,
        phone: a.phone,
        whatsapp: a.whatsapp,
        email: a.email,
        institution: a.institution,
        occupation: a.occupation,
        dateAppointed: a.dateAppointed,
        submittedById: admin.id,
      })
      .returning();

    let photoUploaded = false;
    try {
      const res = await fetch(a.photoUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const blobUrl = await uploadFile(buffer, `${a.fullName}.jpg`, contentType);

      await db.insert(documents).values({
        parentType: "appointee",
        parentId: created.id,
        filename: blobUrl.split("/").pop() ?? `${a.fullName}.jpg`,
        originalFilename: `${a.fullName}.jpg`,
        mimeType: contentType,
        sizeBytes: buffer.length,
        blobUrl,
        uploadedById: admin.id,
      });
      photoUploaded = true;
    } catch (err) {
      warnings.push(`Photo failed for ${a.fullName} (${position}): ${String(err)}`);
    }

    createdAppointees.push({ position, reference, name: a.fullName, photoUploaded });
  }

  return NextResponse.json({
    ok: true,
    youthMp: { id: youthMp.id, name: youthMp.fullName, constituency: constituency.name, region: region.name },
    appointeesCreated: createdAppointees,
    warnings,
  });
}
