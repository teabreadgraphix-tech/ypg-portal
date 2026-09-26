import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

  // Same error for "no such user" and "wrong password" — never reveal which one.
  const genericError = { error: "Incorrect email or password." };

  if (!user) {
    return NextResponse.json(genericError, { status: 401 });
  }
  if (user.status !== "Active") {
    return NextResponse.json(
      { error: "This account is not active. Contact your Super Admin." },
      { status: 403 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(genericError, { status: 401 });
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
