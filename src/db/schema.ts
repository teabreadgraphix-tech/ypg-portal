import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Roles & Users
// ---------------------------------------------------------------------------

export const roleNameEnum = pgEnum("role_name", [
  "super_admin",
  "deputy_project_manager",
  "youth_mp",
  "viewer",
]);

export const userStatusEnum = pgEnum("user_status", ["Active", "Suspended", "Inactive"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: roleNameEnum("role").notNull().default("youth_mp"),
  status: userStatusEnum("status").notNull().default("Active"),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Geography & categories
// ---------------------------------------------------------------------------

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const constituencies = pgTable(
  "constituencies",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    regionId: integer("region_id").notNull().references(() => regions.id),
  },
  (t) => [unique().on(t.name, t.regionId)],
);

export const categoryTypeEnum = pgEnum("category_type", ["appointment", "project", "letter"]);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    type: categoryTypeEnum("type").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [unique().on(t.type, t.name)],
);

// ---------------------------------------------------------------------------
// Reference numbers: YPG-<TYPE>-<YEAR>-<sequence>
// ---------------------------------------------------------------------------

export const referenceTypeEnum = pgEnum("reference_type", ["APP", "PRO", "COR", "PRJ", "ACT", "RPT"]);

export const referenceSequences = pgTable(
  "reference_sequences",
  {
    id: serial("id").primaryKey(),
    type: referenceTypeEnum("type").notNull(),
    year: integer("year").notNull(),
    lastSequence: integer("last_sequence").notNull().default(0),
  },
  (t) => [unique().on(t.type, t.year)],
);

// ---------------------------------------------------------------------------
// Youth MPs
// ---------------------------------------------------------------------------

export const youthMpStatusEnum = pgEnum("youth_mp_status", ["Active", "Inactive"]);

export const youthMps = pgTable("youth_mps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  gender: text("gender"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  constituencyId: integer("constituency_id").notNull().references(() => constituencies.id),
  regionId: integer("region_id").notNull().references(() => regions.id),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  status: youthMpStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Appointees (Master Registry)
// ---------------------------------------------------------------------------

export const appointeeStatusEnum = pgEnum("appointee_status", [
  "Pending",
  "Active",
  "Inactive",
  "Resigned",
  "Removed",
]);

export const appointees = pgTable("appointees", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  photoUrl: text("photo_url"),
  name: text("name").notNull(),
  gender: text("gender"),
  dob: date("dob"),
  position: text("position").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  constituencyId: integer("constituency_id").notNull().references(() => constituencies.id),
  regionId: integer("region_id").notNull().references(() => regions.id),
  appointingYouthMpId: integer("appointing_youth_mp_id").notNull().references(() => youthMps.id),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  institution: text("institution"),
  occupation: text("occupation"),
  dateAppointed: date("date_appointed"),
  status: appointeeStatusEnum("status").notNull().default("Pending"),
  bio: text("bio"),
  notes: text("notes"),
  isArchived: boolean("is_archived").notNull().default(false),
  submittedById: integer("submitted_by_id").notNull().references(() => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Project proposals
// ---------------------------------------------------------------------------

export const proposalStatusEnum = pgEnum("proposal_status", [
  "Draft",
  "Submitted",
  "Under Review",
  "Revision Required",
  "Approved",
  "Rejected",
  "Ongoing",
  "Completed",
]);

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  title: text("title").notNull(),
  youthMpId: integer("youth_mp_id").notNull().references(() => youthMps.id),
  constituencyId: integer("constituency_id").notNull().references(() => constituencies.id),
  regionId: integer("region_id").notNull().references(() => regions.id),
  categoryId: integer("category_id").references(() => categories.id),
  problemStatement: text("problem_statement"),
  background: text("background"),
  objectives: text("objectives"),
  beneficiaries: text("beneficiaries"),
  activities: text("activities"),
  expectedOutcomes: text("expected_outcomes"),
  methodology: text("methodology"),
  location: text("location"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 14, scale: 2 }),
  fundingSource: text("funding_source"),
  partners: text("partners"),
  sustainabilityPlan: text("sustainability_plan"),
  mePlan: text("me_plan"),
  status: proposalStatusEnum("status").notNull().default("Draft"),
  submittedById: integer("submitted_by_id").notNull().references(() => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Projects, milestones, reports
// ---------------------------------------------------------------------------

export const projectStatusEnum = pgEnum("project_status", [
  "Planned",
  "Approved",
  "Ongoing",
  "Suspended",
  "Completed",
  "Archived",
]);

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  name: text("name").notNull(),
  proposalId: integer("proposal_id").references(() => proposals.id),
  youthMpId: integer("youth_mp_id").notNull().references(() => youthMps.id),
  constituencyId: integer("constituency_id").notNull().references(() => constituencies.id),
  regionId: integer("region_id").notNull().references(() => regions.id),
  projectManagerId: integer("project_manager_id").references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 14, scale: 2 }),
  fundingSource: text("funding_source"),
  beneficiaries: text("beneficiaries"),
  location: text("location"),
  objectives: text("objectives"),
  progress: integer("progress").notNull().default(0),
  status: projectStatusEnum("status").notNull().default("Planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "Pending",
  "In Progress",
  "Completed",
  "Delayed",
]);

export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: milestoneStatusEnum("status").notNull().default("Pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const projectReports = pgTable("project_reports", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  activitiesCompleted: text("activities_completed"),
  achievements: text("achievements"),
  challenges: text("challenges"),
  beneficiariesReached: integer("beneficiaries_reached"),
  expenditure: numeric("expenditure", { precision: 14, scale: 2 }),
  recommendations: text("recommendations"),
  nextSteps: text("next_steps"),
  submittedById: integer("submitted_by_id").notNull().references(() => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Letters & correspondence
// ---------------------------------------------------------------------------

export const letterDirectionEnum = pgEnum("letter_direction", ["Incoming", "Outgoing"]);

export const letterStatusEnum = pgEnum("letter_status", [
  "Received",
  "Under Review",
  "Action Required",
  "Responded",
  "Closed",
  "Archived",
]);

export const letters = pgTable("letters", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  direction: letterDirectionEnum("direction").notNull(),
  dateReceived: date("date_received"),
  dateSent: date("date_sent"),
  sender: text("sender"),
  senderOrg: text("sender_org"),
  recipient: text("recipient"),
  subject: text("subject").notNull(),
  description: text("description"),
  responsibleOfficerId: integer("responsible_officer_id").references(() => users.id),
  deadline: date("deadline"),
  status: letterStatusEnum("status").notNull().default("Received"),
  responseRequired: boolean("response_required").notNull().default(false),
  responseDate: date("response_date"),
  notes: text("notes"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Action plans
// ---------------------------------------------------------------------------

export const actionPlanPriorityEnum = pgEnum("action_plan_priority", ["Low", "Medium", "High", "Urgent"]);
export const actionPlanStatusEnum = pgEnum("action_plan_status", [
  "Pending",
  "In Progress",
  "Completed",
  "Delayed",
  "Cancelled",
]);

export const actionPlans = pgTable("action_plans", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  actionItem: text("action_item").notNull(),
  objective: text("objective"),
  responsibleUserId: integer("responsible_user_id").references(() => users.id),
  responsibleYouthMpId: integer("responsible_youth_mp_id").references(() => youthMps.id),
  department: text("department"),
  startDate: date("start_date"),
  deadline: date("deadline"),
  priority: actionPlanPriorityEnum("priority").notNull().default("Medium"),
  status: actionPlanStatusEnum("status").notNull().default("Pending"),
  progress: integer("progress").notNull().default(0),
  notes: text("notes"),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Documents (generic attachment, any module)
// ---------------------------------------------------------------------------

export const documentParentTypeEnum = pgEnum("document_parent_type", [
  "appointee",
  "youth_mp",
  "proposal",
  "project",
  "project_report",
  "letter",
  "action_plan",
]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  parentType: documentParentTypeEnum("parent_type").notNull(),
  parentId: integer("parent_id").notNull(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  blobUrl: text("blob_url").notNull(),
  uploadedById: integer("uploaded_by_id").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
] as const;
export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Comments (review actions + revision history, polymorphic)
// ---------------------------------------------------------------------------

export const commentParentTypeEnum = pgEnum("comment_parent_type", [
  "appointee",
  "proposal",
  "project",
  "project_report",
  "letter",
  "action_plan",
]);
export const commentActionEnum = pgEnum("comment_action", [
  "comment",
  "approved",
  "rejected",
  "revision_requested",
]);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  parentType: commentParentTypeEnum("parent_type").notNull(),
  parentId: integer("parent_id").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  action: commentActionEnum("action").notNull().default("comment"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  reference: text("reference"),
  details: text("details").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
