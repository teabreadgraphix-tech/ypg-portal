import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | null = null;

function getDb(): Db {
  if (_db) return _db;

  const raw = process.env.DATABASE_URL ?? "";
  const url = raw.trim().replace(/^['"]|['"]$/g, "");

  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Add it in your Vercel project's Environment Variables (Settings → Environment Variables), then redeploy.",
    );
  }

  const client = neon(url);
  _db = drizzle(client, { schema });
  return _db;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export type ReferenceType = "APP" | "PRO" | "COR" | "PRJ" | "ACT" | "RPT";

export async function generateReference(type: ReferenceType, year = new Date().getFullYear()) {
  const [row] = await db
    .insert(schema.referenceSequences)
    .values({ type, year, lastSequence: 1 })
    .onConflictDoUpdate({
      target: [schema.referenceSequences.type, schema.referenceSequences.year],
      set: { lastSequence: sql`${schema.referenceSequences.lastSequence} + 1` },
    })
    .returning({ lastSequence: schema.referenceSequences.lastSequence });

  return `YPG-${type}-${year}-${row.lastSequence.toString().padStart(4, "0")}`;
}
