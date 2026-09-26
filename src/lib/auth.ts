import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export type Role = "super_admin" | "deputy_project_manager" | "youth_mp" | "viewer";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  deputy_project_manager: "Deputy Project Manager",
  youth_mp: "Youth MP",
  viewer: "Viewer / Staff",
};

const COOKIE_NAME = "ypg_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET must be set to a long random string (see .env.example).",
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  email: string;
  fullName: string;
  role: Role;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Reads and verifies the session from the request cookies (Server Components / Route Handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// Which roles may access which top-level areas — used by middleware and by
// pages that need a server-side guard. Keep in sync with the sidebar.
export const ROLE_HOME: Record<Role, string> = {
  super_admin: "/dashboard",
  deputy_project_manager: "/dashboard",
  youth_mp: "/dashboard",
  viewer: "/dashboard",
};

export function canAccessAdminSettings(role: Role) {
  return role === "super_admin";
}

export function canReview(role: Role) {
  return role === "super_admin" || role === "deputy_project_manager";
}
