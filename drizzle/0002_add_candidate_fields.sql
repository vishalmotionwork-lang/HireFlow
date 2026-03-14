-- Migration: Add linkedin_url, location, experience, resume_url columns to candidates
-- These support expanded import field mapping options.

ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "linkedin_url" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "experience" text;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "resume_url" text;
