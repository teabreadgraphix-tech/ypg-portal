import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect ?key= value." }, { status: 401 });
  }

  function describe(name: string) {
    const value = process.env[name];
    if (!value) return "MISSING";
    return `present (${value.length} characters, starts with "${value.slice(0, 4)}...")`;
  }

  return NextResponse.json({
    DATABASE_URL: describe("DATABASE_URL"),
    SESSION_SECRET: describe("SESSION_SECRET"),
    BLOB_READ_WRITE_TOKEN: describe("BLOB_READ_WRITE_TOKEN"),
    deployedAt: new Date().toISOString(),
  });
}
