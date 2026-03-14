-- Migration: Add connected_sheets table for Google Sheet sync
DO $$ BEGIN
  CREATE TYPE "public"."sync_frequency" AS ENUM('manual', 'hourly', 'daily');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "connected_sheets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "sheet_url" text NOT NULL,
  "sheet_id" text NOT NULL,
  "gid" text,
  "role_id" uuid NOT NULL REFERENCES "roles"("id"),
  "last_sync_at" timestamp,
  "last_row_count" integer DEFAULT 0 NOT NULL,
  "sync_frequency" "sync_frequency" DEFAULT 'daily' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
