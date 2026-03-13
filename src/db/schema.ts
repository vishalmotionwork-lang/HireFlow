import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
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
  "junior",
  "senior",
  "both",
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
  status: candidateStatusEnum("status").default("left_to_review").notNull(),
  tier: tierEnum("tier").default("untiered").notNull(),
  isDuplicate: boolean("is_duplicate").default(false).notNull(),
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
  createdBy: text("created_by").default("mock-user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
});

export const extractionDrafts = pgTable("extraction_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  importBatchId: uuid("import_batch_id").references(() => importBatches.id),
  sourceUrl: text("source_url"),
  rawData: text("raw_data"),
  extractedData: text("extracted_data"), // JSON stored as text
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
