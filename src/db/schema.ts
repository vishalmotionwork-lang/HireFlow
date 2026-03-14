import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// Enums
export const candidateStatusEnum = pgEnum("candidate_status", [
  "left_to_review",
  "under_review",
  "shortlisted",
  "not_good",
  "maybe",
  "assignment_pending",
  "assignment_sent",
  "assignment_followup",
  "assignment_passed",
  "assignment_failed",
  "hired",
  "rejected",
]);

export const tierEnum = pgEnum("tier", [
  "untiered",
  "intern",
  "junior",
  "senior",
]);

// Tables — ordered to avoid forward references:
// roles → importBatches → candidates → candidateEvents → candidateComments → extractionDrafts

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").default("Briefcase").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  source: text("source").notNull(), // 'excel' | 'csv' | 'paste' | 'url' | 'manual'
  totalRows: integer("total_rows").default(0).notNull(),
  importedCount: integer("imported_count").default(0).notNull(),
  skippedCount: integer("skipped_count").default(0).notNull(),
  createdBy: text("created_by").default("mock-user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  instagram: text("instagram"),
  portfolioUrl: text("portfolio_url"),
  linkedinUrl: text("linkedin_url"),
  location: text("location"),
  experience: text("experience"),
  resumeUrl: text("resume_url"),
  portfolioLinks: jsonb("portfolio_links").default([]).notNull(), // [{url, sourceType, label}]
  socialHandles: jsonb("social_handles").default([]).notNull(), // [{platform, handle, url}]
  status: candidateStatusEnum("status").default("left_to_review").notNull(),
  tier: tierEnum("tier").default("untiered").notNull(),
  isDuplicate: boolean("is_duplicate").default(false).notNull(),
  duplicateOfId: uuid("duplicate_of_id"), // self-referencing — nullable
  duplicateAction: text("duplicate_action"), // 'merged' | 'kept_separate' | null
  rejectionReason: text("rejection_reason"),
  rejectionMessage: text("rejection_message"),
  rejectionMarkedAt: timestamp("rejection_marked_at"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  source: text("source").default("manual").notNull(), // 'manual' | 'excel' | 'csv' | 'paste' | 'url'
  lastModifiedBy: text("last_modified_by"),
  importBatchId: uuid("import_batch_id").references(() => importBatches.id),
  createdBy: text("created_by").default("mock-user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const candidateEvents = pgTable("candidate_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id),
  eventType: text("event_type").notNull(),
  fromValue: text("from_value"),
  toValue: text("to_value").notNull(),
  createdBy: text("created_by").default("mock-user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // INSERT ONLY — no updatedAt
});

export const candidateComments = pgTable("candidate_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id),
  body: text("body").notNull(),
  mentions: jsonb("mentions").default([]).notNull(), // [{userId, name}]
  authorAvatar: text("author_avatar"),
  createdBy: text("created_by").default("mock-user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
});

export const extractionDrafts = pgTable("extraction_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id").references(() => candidates.id),
  importBatchId: uuid("import_batch_id").references(() => importBatches.id),
  sourceUrl: text("source_url"),
  rawText: text("raw_text"),
  extractedData: jsonb("extracted_data"), // ExtractionResult JSON
  platform: text("platform"), // detected platform
  overallConfidence: integer("overall_confidence"), // 0-100
  fieldConfidence: jsonb("field_confidence"), // ConfidenceScore[]
  status: text("status").default("pending").notNull(), // 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed' | 'applied'
  error: text("error"),
  reviewedAt: timestamp("reviewed_at"),
  appliedAt: timestamp("applied_at"),
  createdBy: text("created_by").default("mock-user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Supabase auth user ID
  email: text("email").notNull(),
  name: text("name"),
  avatar: text("avatar"),
  role: text("role").default("viewer").notNull(), // 'admin' | 'editor' | 'viewer'
  isActive: boolean("is_active").default(true).notNull(),
  invitedBy: text("invited_by"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  role: text("role").default("viewer").notNull(), // 'admin' | 'editor' | 'viewer'
  invitedBy: text("invited_by").notNull(),
  status: text("status").default("pending").notNull(), // 'pending' | 'accepted' | 'expired'
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Supabase auth user ID of the recipient
  type: text("type").notNull(), // 'mention' | 'status_change' — extensible
  title: text("title").notNull(), // e.g. "Harshit mentioned you"
  body: text("body").notNull(), // e.g. "in a comment on John Doe: 'Great portfolio...'"
  link: text("link").notNull(), // e.g. "/roles/editor?candidate=uuid"
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'status_change' | 'tier_change' | 'comment' | 'created' | 'imported' | 'merged' | 'rejected' | 'field_update'
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  actorAvatar: text("actor_avatar"),
  candidateId: uuid("candidate_id").references(() => candidates.id),
  candidateName: text("candidate_name"),
  roleId: uuid("role_id").references(() => roles.id),
  roleName: text("role_name"),
  metadata: jsonb("metadata").default({}).notNull(), // flexible payload per activity type
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
