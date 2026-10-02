import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointees, documents, users } from "@/db/schema";
import { uploadFile } from "@/lib/storage";

const PHOTOS: Record<string, string> = {
  "YPG-APP-2026-0001": "https://storage.tally.so/private/IMG-20260926-WA0125.jpg?id=gPjb5M&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImdQamI1TSIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.nCdGetqw5jrYCrqgvA2mGBnFVoXk6PAY6hTVVkc_9Ew&signature=1065edbe48884355db60b8f1062a56724558e94c0c2e3b41b75028f49011a229",
  "YPG-APP-2026-0002": "https://storage.tally.so/private/IMG-20260928-WA0005.jpg?id=v6Xd7D&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InY2WGQ3RCIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.QZw7tcXlMRHu5smA-eFcZnjwGrYJ6xCUKM9DGiC0aVc&signature=bc9c76d742764793a228ee78f13ea00fffeedc9ef12e47e5374755aaa54b1ca2",
  "YPG-APP-2026-0003": "https://storage.tally.so/private/IMG-20260926-WA0127-1-.jpg?id=zBXNMM&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InpCWE5NTSIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.zU0qP0MfWPQwQOnDVM92gdR3tz1fVD6TFn5LvlRPBJk&signature=35666bb48d9c6547e5d6b8e67ec419d6e4c121070d0116a73d7da5e76fbb9149",
  "YPG-APP-2026-0004": "https://storage.tally.so/private/IMG-20260927-WA0085.jpg?id=2d8BLV&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJkOEJMViIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.DoV1MHkmhnaa0VUjiFc5TQWxcDiWWdeGteWYrOoLnt0&signature=b42b149895607ed1334b81502f687c8e40aea6a09b722093645bd2876bbf837f",
  "YPG-APP-2026-0005": "https://storage.tally.so/private/IMG-20260928-WA0010.jpg?id=dGbvZV&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRHYnZaViIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.5h3WXbFuu7MNxyTvHYi94idM803H3RBqL-YL7YXaMK8&signature=a47e241b2250ee8374f769a9abbee18753f8d9982c84dd4c41982e2bba80e6ff",
  "YPG-APP-2026-0006": "https://storage.tally.so/private/IMG-20260927-WA0020-1-.jpg?id=qQ5vx5&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InFRNXZ4NSIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.RKqT0XsPfqKH0VcWvf4JRNh3G0JdZJxV1dBMIPoghZ4&signature=76140bf98dd39906ce016ebeef999382b8721da69bddd335794e4aa08ce473e1",
  "YPG-APP-2026-0007": "https://storage.tally.so/private/IMG-20260929-WA0026.jpg?id=9091GV&accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkwOTFHViIsImZvcm1JZCI6ImRXclhyZCIsImlhdCI6MTc5MDcxNjI2M30.2-XgZN5q3IFd_T-1hQvBtD_iNTX8aF1ZLTxFDeOrdHY&signature=385b4d9b0047780bc82f55d111444f598aae9d0d87264be6f753d324352d0152",
};

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect ?key= value." }, { status: 401 });
  }

  const [admin] = await db.select().from(users).where(eq(users.email, "admin@ypg.gov.gh")).limit(1);
  if (!admin) {
    return NextResponse.json({ error: "admin@ypg.gov.gh not found." }, { status: 400 });
  }

  const results: Record<string, string> = {};

  for (const [reference, photoUrl] of Object.entries(PHOTOS)) {
    const [appointee] = await db.select().from(appointees).where(eq(appointees.reference, reference)).limit(1);
    if (!appointee) {
      results[reference] = "skipped: appointee not found";
      continue;
    }
    const [existingDoc] = await db
      .select()
      .from(documents)
      .where(eq(documents.parentId, appointee.id))
      .limit(1);
    if (existingDoc) {
      results[reference] = "skipped: photo already attached";
      continue;
    }

    try {
      const res = await fetch(photoUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const blobUrl = await uploadFile(buffer, `${appointee.name}.jpg`, contentType);

      await db.insert(documents).values({
        parentType: "appointee",
        parentId: appointee.id,
        filename: blobUrl.split("/").pop() ?? `${appointee.name}.jpg`,
        originalFilename: `${appointee.name}.jpg`,
        mimeType: contentType,
        sizeBytes: buffer.length,
        blobUrl,
        uploadedById: admin.id,
      });
      results[reference] = "uploaded";
    } catch (err) {
      results[reference] = `failed: ${String(err)}`;
    }
  }

  return NextResponse.json({ ok: true, results });
}
