import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Add it in your Vercel project's Environment Variables.");
}

const client = neon(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

export type ReferenceType = "APP" | "PRO" | "COR" | "PRJ" | "ACT" | "RPT";

/**
 * Atomically allocates the next sequence number for a reference type + year
 * and returns e.g. "YPG-APP-2026-0001". Safe under concurrent submissions.
 */
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
