-- Add candidate_ratings table for team scoring/rating system
CREATE TABLE IF NOT EXISTS "candidate_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "candidate_id" uuid NOT NULL REFERENCES "candidates"("id"),
  "user_id" text NOT NULL,
  "rating" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "candidate_ratings_candidate_user_unique" UNIQUE("candidate_id", "user_id")
);

-- Index for fast lookups by candidate
CREATE INDEX IF NOT EXISTS "candidate_ratings_candidate_id_idx" ON "candidate_ratings" ("candidate_id");
