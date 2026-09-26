import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { db } from "@/db";
import {
  regions, constituencies, categories, users, youthMps, appointees, proposals, projects, letters, actionPlans,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

function enumSql(name: string, values: string[]) {
  const list = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
  return `DO $$ BEGIN
    CREATE TYPE ${name} AS ENUM (${list});
  EXCEPTION WHEN duplicate_object THEN null; END $$;`;
}

const STATEMENTS = [
  enumSql("role_name", ["super_admin", "deputy_project_manager", "youth_mp", "viewer"]),
  enumSql("user_status", ["Active", "Suspended", "Inactive"]),
  enumSql("category_type", ["appointment", "project", "letter"]),
  enumSql("reference_type", ["APP", "PRO", "COR", "PRJ", "ACT", "RPT"]),
  enumSql("youth_mp_status", ["Active", "Inactive"]),
  enumSql("appointee_status", ["Pending", "Active", "Inactive", "Resigned", "Removed"]),
  enumSql("proposal_status", ["Draft", "Submitted", "Under Review", "Revision Required", "Approved", "Rejected", "Ongoing", "Completed"]),
  enumSql("project_status", ["Planned", "Approved", "Ongoing", "Suspended", "Completed", "Archived"]),
  enumSql("milestone_status", ["Pending", "In Progress", "Completed", "Delayed"]),
  enumSql("letter_direction", ["Incoming", "Outgoing"]),
  enumSql("letter_status", ["Received", "Under Review", "Action Required", "Responded", "Closed", "Archived"]),
  enumSql("action_plan_priority", ["Low", "Medium", "High", "Urgent"]),
  enumSql("action_plan_status", ["Pending", "In Progress", "Completed", "Delayed", "Cancelled"]),
  enumSql("document_parent_type", ["appointee", "youth_mp", "proposal", "project", "project_report", "letter", "action_plan"]),
  enumSql("comment_parent_type", ["appointee", "proposal", "project", "project_report", "letter", "action_plan"]),
  enumSql("comment_action", ["comment", "approved", "rejected", "revision_requested"]),

  `CREATE TABLE IF NOT EXISTS users (
    id serial PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    phone text,
    role role_name NOT NULL DEFAULT 'youth_mp',
    status user_status NOT NULL DEFAULT 'Active',
    reset_token_hash text,
    reset_token_expires_at timestamptz,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS regions (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE
  );`,

  `CREATE TABLE IF NOT EXISTS constituencies (
    id serial PRIMARY KEY,
    name text NOT NULL,
    region_id integer NOT NULL REFERENCES regions(id),
    UNIQUE (name, region_id)
  );`,

  `CREATE TABLE IF NOT EXISTS categories (
    id serial PRIMARY KEY,
    type category_type NOT NULL,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    UNIQUE (type, name)
  );`,

  `CREATE TABLE IF NOT EXISTS reference_sequences (
    id serial PRIMARY KEY,
    type reference_type NOT NULL,
    year integer NOT NULL,
    last_sequence integer NOT NULL DEFAULT 0,
    UNIQUE (type, year)
  );`,

  `CREATE TABLE IF NOT EXISTS youth_mps (
    id serial PRIMARY KEY,
    user_id integer REFERENCES users(id),
    full_name text NOT NULL,
    gender text,
    phone text,
    whatsapp text,
    email text,
    constituency_id integer NOT NULL REFERENCES constituencies(id),
    region_id integer NOT NULL REFERENCES regions(id),
    photo_url text,
    bio text,
    status youth_mp_status NOT NULL DEFAULT 'Active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS appointees (
    id serial PRIMARY KEY,
    reference text NOT NULL UNIQUE,
    photo_url text,
    name text NOT NULL,
    gender text,
    dob date,
    position text NOT NULL,
    category_id integer REFERENCES categories(id),
    constituency_id integer NOT NULL REFERENCES constituencies(id),
    region_id integer NOT NULL REFERENCES regions(id),
    appointing_youth_mp_id integer NOT NULL REFERENCES youth_mps(id),
    phone text,
    whatsapp text,
    email text,
    institution text,
    occupation text,
    date_appointed date,
    status appointee_status NOT NULL DEFAULT 'Pending',
    bio text,
    notes text,
    is_archived boolean NOT NULL DEFAULT false,
    submitted_by_id integer NOT NULL REFERENCES users(id),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS proposals (
    id serial PRIMARY KEY,
    reference text NOT NULL UNIQUE,
    title text NOT NULL,
    youth_mp_id integer NOT NULL REFERENCES youth_mps(id),
    constituency_id integer NOT NULL REFERENCES constituencies(id),
    region_id integer NOT NULL REFERENCES regions(id),
    category_id integer REFERENCES categories(id),
    problem_statement text,
    background text,
    objectives text,
    beneficiaries text,
    activities text,
    expected_outcomes text,
    methodology text,
    location text,
    start_date date,
    end_date date,
    budget numeric(14,2),
    funding_source text,
    partners text,
    sustainability_plan text,
    me_plan text,
    status proposal_status NOT NULL DEFAULT 'Draft',
    submitted_by_id integer NOT NULL REFERENCES users(id),
    submitted_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS projects (
    id serial PRIMARY KEY,
    reference text NOT NULL UNIQUE,
    name text NOT NULL,
    proposal_id integer REFERENCES proposals(id),
    youth_mp_id integer NOT NULL REFERENCES youth_mps(id),
    constituency_id integer NOT NULL REFERENCES constituencies(id),
    region_id integer NOT NULL REFERENCES regions(id),
    project_manager_id integer REFERENCES users(id),
    start_date date,
    end_date date,
    budget numeric(14,2),
    funding_source text,
    beneficiaries text,
    location text,
    objectives text,
    progress integer NOT NULL DEFAULT 0,
    status project_status NOT NULL DEFAULT 'Planned',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS project_milestones (
    id serial PRIMARY KEY,
    project_id integer NOT NULL REFERENCES projects(id),
    title text NOT NULL,
    description text,
    due_date date,
    status milestone_status NOT NULL DEFAULT 'Pending',
    completed_at timestamptz
  );`,

  `CREATE TABLE IF NOT EXISTS project_reports (
    id serial PRIMARY KEY,
    reference text NOT NULL UNIQUE,
    project_id integer NOT NULL REFERENCES projects(id),
    period_start date NOT NULL,
    period_end date NOT NULL,
    activities_completed text,
    achievements text,
    challenges text,
    beneficiaries_reached integer,
    expenditure numeric(14,2),
    recommendations text,
    next_steps text,
    submitted_by_id integer NOT NULL REFERENCES users(id),
    submitted_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS letters (
    id serial PRIMARY KEY,
    reference text NOT NULL UNIQUE,
    category_id integer NOT NULL REFERENCES categories(id),
    direction letter_direction NOT NULL,
    date_received date,
    date_sent date,
    sender text,
    sender_org text,
    recipient text,
    subject text NOT NULL,
    description text,
    responsible_officer_id integer REFERENCES users(id),
    deadline date,
    status letter_status NOT NULL DEFAULT 'Received',
    response_required boolean NOT NULL DEFAULT false,
    response_date date,
    notes text,
    created_by_id integer NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS action_plans (
    id serial PRIMARY KEY,
    reference text NOT NULL UNIQUE,
    action_item text NOT NULL,
    objective text,
    responsible_user_id integer REFERENCES users(id),
    responsible_youth_mp_id integer REFERENCES youth_mps(id),
    department text,
    start_date date,
    deadline date,
    priority action_plan_priority NOT NULL DEFAULT 'Medium',
    status action_plan_status NOT NULL DEFAULT 'Pending',
    progress integer NOT NULL DEFAULT 0,
    notes text,
    created_by_id integer NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS documents (
    id serial PRIMARY KEY,
    parent_type document_parent_type NOT NULL,
    parent_id integer NOT NULL,
    filename text NOT NULL,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    blob_url text NOT NULL,
    uploaded_by_id integer NOT NULL REFERENCES users(id),
    uploaded_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id),
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS comments (
    id serial PRIMARY KEY,
    parent_type comment_parent_type NOT NULL,
    parent_id integer NOT NULL,
    author_id integer NOT NULL REFERENCES users(id),
    action comment_action NOT NULL DEFAULT 'comment',
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS activity_logs (
    id serial PRIMARY KEY,
    user_id integer REFERENCES users(id),
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    reference text,
    details text NOT NULL,
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
  );`,
];

async function seedDemoData() {
  const [existingAdmin] = await db.select().from(users).where(eq(users.email, "admin@ypg.gov.gh")).limit(1);
  if (existingAdmin) return { seeded: false, reason: "Demo data already present." };

  const [greaterAccra] = await db.insert(regions).values({ name: "Greater Accra" }).returning();
  const [ashanti] = await db.insert(regions).values({ name: "Ashanti" }).returning();

  const [ablekuma] = await db.insert(constituencies).values({ name: "Ablekuma North", regionId: greaterAccra.id }).returning();
  const [okaikwei] = await db.insert(constituencies).values({ name: "Okaikwei Central", regionId: greaterAccra.id }).returning();
  const [subin] = await db.insert(constituencies).values({ name: "Subin", regionId: ashanti.id }).returning();

  await db.insert(categories).values([
    { type: "appointment", name: "Constituency Coordinator" },
    { type: "appointment", name: "Youth Advisor" },
    { type: "project", name: "Education" },
    { type: "project", name: "Health" },
    { type: "letter", name: "Invitation" },
    { type: "letter", name: "Partnership" },
  ]);

  const [admin] = await db.insert(users).values({
    email: "admin@ypg.gov.gh",
    passwordHash: await hashPassword("ChangeMe123!"),
    fullName: "Ama Owusu (Demo Super Admin)",
    role: "super_admin",
  }).returning();

  const [dpm] = await db.insert(users).values({
    email: "dpm@ypg.gov.gh",
    passwordHash: await hashPassword("ChangeMe123!"),
    fullName: "Kwesi Mensah (Demo Deputy Project Manager)",
    role: "deputy_project_manager",
  }).returning();

  const [mp1User] = await db.insert(users).values({
    email: "mp1@ypg.gov.gh",
    passwordHash: await hashPassword("ChangeMe123!"),
    fullName: "Efua Asante (Demo Youth MP)",
    role: "youth_mp",
  }).returning();

  const [mp1] = await db.insert(youthMps).values({
    userId: mp1User.id, fullName: "Efua Asante", gender: "Female",
    constituencyId: ablekuma.id, regionId: greaterAccra.id, phone: "0200000001",
  }).returning();
  const [mp2] = await db.insert(youthMps).values({
    fullName: "Kojo Boateng", gender: "Male",
    constituencyId: okaikwei.id, regionId: greaterAccra.id, phone: "0200000002",
  }).returning();
  const [mp3] = await db.insert(youthMps).values({
    fullName: "Abena Darko", gender: "Female",
    constituencyId: subin.id, regionId: ashanti.id, phone: "0200000003",
  }).returning();
  await db.insert(youthMps).values([
    { fullName: "Yaw Owusu", gender: "Male", constituencyId: ablekuma.id, regionId: greaterAccra.id, phone: "0200000004" },
    { fullName: "Adjoa Frimpong", gender: "Female", constituencyId: subin.id, regionId: ashanti.id, phone: "0200000005" },
  ]);

  const year = new Date().getFullYear();
  const mps = [mp1, mp2, mp3];

  for (let i = 1; i <= 15; i++) {
    const mp = mps[i % 3];
    await db.insert(appointees).values({
      reference: `YPG-APP-${year}-DEMO${String(i).padStart(2, "0")}`,
      name: `Demo Appointee ${i}`,
      position: i % 2 === 0 ? "Constituency Youth Coordinator" : "Youth Advisor",
      constituencyId: mp.constituencyId,
      regionId: mp.regionId,
      appointingYouthMpId: mp.id,
      phone: `02010000${String(i).padStart(2, "0")}`,
      status: (["Pending", "Active", "Active", "Inactive"] as const)[i % 4],
      submittedById: mp1User.id,
    });
  }

  const proposalStatuses = ["Submitted", "Under Review", "Approved", "Revision Required", "Draft"] as const;
  for (let i = 1; i <= 5; i++) {
    const mp = mps[i % 3];
    await db.insert(proposals).values({
      reference: `YPG-PRO-${year}-DEMO0${i}`,
      title: `Demo Community Project Proposal ${i}`,
      youthMpId: mp.id,
      constituencyId: mp.constituencyId,
      regionId: mp.regionId,
      status: proposalStatuses[i - 1],
      submittedById: mp1User.id,
      budget: "5000.00",
    });
  }

  const projectStatuses = ["Planned", "Ongoing", "Completed"] as const;
  for (let i = 1; i <= 3; i++) {
    const mp = mps[i % 3];
    await db.insert(projects).values({
      reference: `YPG-PRJ-${year}-DEMO0${i}`,
      name: `Demo Youth Project ${i}`,
      youthMpId: mp.id,
      constituencyId: mp.constituencyId,
      regionId: mp.regionId,
      status: projectStatuses[i - 1],
      budget: "8000.00",
    });
  }

  const letterCategories = await db.select().from(categories);
  const letterCatId = letterCategories.find((c) => c.type === "letter")?.id ?? letterCategories[0].id;
  const letterStatuses = ["Received", "Under Review", "Action Required", "Responded", "Closed"] as const;
  for (let i = 1; i <= 5; i++) {
    await db.insert(letters).values({
      reference: `YPG-COR-${year}-DEMO0${i}`,
      categoryId: letterCatId,
      direction: i % 2 === 0 ? "Outgoing" : "Incoming",
      subject: `Demo Letter Subject ${i}`,
      sender: "Demo Organization",
      status: letterStatuses[i - 1],
      createdById: dpm.id,
    });
  }

  const actionStatuses = ["Pending", "In Progress", "Completed", "Delayed", "Pending"] as const;
  const priorities = ["Low", "Medium", "High", "Urgent", "Medium"] as const;
  const progresses = [0, 40, 100, 20, 0];
  for (let i = 1; i <= 5; i++) {
    await db.insert(actionPlans).values({
      reference: `YPG-ACT-${year}-DEMO0${i}`,
      actionItem: `Demo Action Item ${i}`,
      priority: priorities[i - 1],
      status: actionStatuses[i - 1],
      progress: progresses[i - 1],
      createdById: dpm.id,
    });
  }

  return { seeded: true };
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Missing or incorrect ?key= value." }, { status: 401 });
  }

  const rawUrl = (process.env.DATABASE_URL ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!rawUrl) {
    return NextResponse.json({ error: "DATABASE_URL is not set." }, { status: 500 });
  }

  const sql = neon(rawUrl);
  const ran: string[] = [];
  try {
    for (const statement of STATEMENTS) {
         await sql(statement);
      ran.push(statement.slice(0, 40).replace(/\s+/g, " ") + "…");
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed while creating tables.", detail: String(err), completedSoFar: ran },
      { status: 500 },
    );
  }

  try {
    const seedResult = await seedDemoData();
    return NextResponse.json({
      ok: true,
      tablesCreated: ran.length,
      seed: seedResult,
      loginHint: "admin@ypg.gov.gh / ChangeMe123! — change this password once you're in.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: true, tablesCreated: ran.length, seedError: String(err) },
      { status: 200 },
    );
  }
}
