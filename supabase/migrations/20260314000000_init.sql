CREATE TYPE "public"."candidate_status" AS ENUM('left_to_review', 'under_review', 'shortlisted', 'not_good', 'maybe', 'assignment_pending', 'assignment_sent', 'assignment_followup', 'assignment_passed', 'assignment_failed', 'hired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('untiered', 'junior', 'senior', 'both');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_avatar" text,
	"candidate_id" uuid,
	"candidate_name" text,
	"role_id" uuid,
	"role_name" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"body" text NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_avatar" text,
	"created_by" text DEFAULT 'mock-user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "candidate_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_value" text,
	"to_value" text NOT NULL,
	"created_by" text DEFAULT 'mock-user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"instagram" text,
	"portfolio_url" text,
	"portfolio_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"social_handles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "candidate_status" DEFAULT 'left_to_review' NOT NULL,
	"tier" "tier" DEFAULT 'untiered' NOT NULL,
	"is_duplicate" boolean DEFAULT false NOT NULL,
	"duplicate_of_id" uuid,
	"duplicate_action" text,
	"rejection_reason" text,
	"rejection_message" text,
	"rejection_marked_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"last_modified_by" text,
	"import_batch_id" uuid,
	"created_by" text DEFAULT 'mock-user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid,
	"import_batch_id" uuid,
	"source_url" text,
	"raw_text" text,
	"extracted_data" jsonb,
	"platform" text,
	"overall_confidence" integer,
	"field_confidence" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"reviewed_at" timestamp,
	"applied_at" timestamp,
	"created_by" text DEFAULT 'mock-user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"source" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"created_by" text DEFAULT 'mock-user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT 'Briefcase' NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_comments" ADD CONSTRAINT "candidate_comments_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_events" ADD CONSTRAINT "candidate_events_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_drafts" ADD CONSTRAINT "extraction_drafts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_drafts" ADD CONSTRAINT "extraction_drafts_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;-- Migration: Update tier enum
-- Remove "both", add "intern"

-- Step 1: Update any candidates with tier='both' to 'untiered'
UPDATE "candidates" SET "tier" = 'untiered' WHERE "tier" = 'both';

-- Step 2: Drop the default so we can change the column type
ALTER TABLE "candidates" ALTER COLUMN "tier" DROP DEFAULT;

-- Step 3: Create new enum (if it doesn't exist from a failed prior run, drop it first)
DROP TYPE IF EXISTS "tier_new";
CREATE TYPE "tier_new" AS ENUM ('untiered', 'intern', 'junior', 'senior');

-- Step 4: Update the column to use the new enum
ALTER TABLE "candidates" ALTER COLUMN "tier" TYPE "tier_new" USING "tier"::text::"tier_new";

-- Step 5: Drop old enum and rename new one
DROP TYPE "tier" CASCADE;
ALTER TYPE "tier_new" RENAME TO "tier";

-- Step 6: Restore the default
ALTER TABLE "candidates" ALTER COLUMN "tier" SET DEFAULT 'untiered';
