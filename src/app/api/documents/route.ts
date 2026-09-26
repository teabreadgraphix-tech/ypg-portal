import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES, documentParentTypeEnum } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

type ParentType = (typeof documentParentTypeEnum.enumValues)[number];
const VALID_PARENT_TYPES = new Set<string>(documentParentTypeEnum.enumValues);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const parentType = form?.get("parentType");
  const parentId = form?.get("parentId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (typeof parentType !== "string" || !VALID_PARENT_TYPES.has(parentType)) {
    return NextResponse.json({ error: `parentType must be one of: ${[...VALID_PARENT_TYPES].join(", ")}` }, { status: 400 });
  }
  const parentIdNum = Number(parentId);
  if (!Number.isInteger(parentIdNum) || parentIdNum <= 0) {
    return NextResponse.json({ error: "parentId must be a positive integer." }, { status: 400 });
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, JPG, PNG." },
      { status: 400 },
    );
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max size is ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)}MB.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blobUrl = await uploadFile(buffer, file.name, file.type);

  const [record] = await db
    .insert(documents)
    .values({
      parentType: parentType as ParentType,
      parentId: parentIdNum,
      filename: blobUrl.split("/").pop() ?? file.name,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      blobUrl,
      uploadedById: session.userId,
    })
    .returning();

  return NextResponse.json(record, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parentType = searchParams.get("parentType");
  const parentId = searchParams.get("parentId");
  if (!parentType || !VALID_PARENT_TYPES.has(parentType) || !parentId) {
    return NextResponse.json({ error: "parentType and parentId are required." }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.parentType, parentType as ParentType), eq(documents.parentId, Number(parentId))));
  return NextResponse.json(rows);
}
