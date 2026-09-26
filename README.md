# Youth Parliament Ghana — Programmes, Projects & Logistics Portal

Rebuilt as a single Next.js app so it deploys cleanly on **Vercel's free
tier** with no Replit-specific services: its own built-in login (no Clerk
account needed), Vercel Blob for file storage, and a free Neon Postgres
database.

## What's fully working right now
- Login / logout, hashed passwords, role-based access (Super Admin, Deputy
  Project Manager, Youth MP, Viewer), session cookies
- Dashboard with real stat cards computed from the database, plus a recent
  activity feed
- **Appointees / Master Registry**: submission form (with photo upload),
  search + status filter, responsive table→cards, detail view, status
  changes, auto-generated `YPG-APP-<year>-<seq>` reference numbers
- File uploads (Vercel Blob) — validated type (PDF/Word/Excel/PowerPoint/
  JPG/PNG) and size (25MB max)
- Activity log entries for every create/status-change action

## What's a labeled "Coming Soon" placeholder for now
Youth MPs, Projects, Project Proposals, Project Reports, Letters &
Correspondence, Action Plans, the Documents hub view, Notifications,
Reports & Analytics, Activity Log page, and Settings. **The database tables
for all of these already exist** (`src/db/schema.ts`) — each is now a matter
of building the same pattern used for Appointees (list + form + detail +
API routes), not designing anything from scratch. Ask me to build any of
these next, one at a time.

## Deploying (free, ~15 minutes)

1. **Create a free Neon database** at [neon.tech](https://neon.tech). Copy
   its connection string (starts with `postgresql://`).
2. **Put this code on GitHub.** Create a free account, make a new repository,
   and use the "uploading an existing file" link to drag this whole folder
   in (no `git` command needed).
3. **Import into Vercel.** Sign up at [vercel.com](https://vercel.com) with
   GitHub, click "Add New" → "Project", pick your repo. Vercel detects
   Next.js automatically — don't change any build settings.
4. **Add Environment Variables** (Vercel → your project → Settings →
   Environment Variables):
   - `DATABASE_URL` — the Neon connection string from step 1
   - `SESSION_SECRET` — any long random string (32+ characters)
5. **Deploy.** Click Deploy.
6. **Add a Blob store**: in the same Vercel project, go to **Storage** →
   **Create Database** → **Blob**, connect it — Vercel sets
   `BLOB_READ_WRITE_TOKEN` for you automatically. Redeploy once after this.
7. **Create the tables and demo data**, from your own computer (needs
   Node.js installed — or ask me and I'll write out the exact commands for
   whichever machine you're using):
   ```
   npm install
   # put your Neon connection string in a file named .env.local, then:
   npm run db:push
   npm run db:seed
   ```
8. Open your `.vercel.app` link and sign in with one of the seeded demo
   accounts (printed at the end of the seed script) — **change these
   passwords immediately** by creating real accounts once Settings/User
   management is built.

If any step throws a red error, copy/paste it here and I'll walk you
through the fix.
