-- Migration: Add auto-detect role columns to connected_sheets
-- Enables per-row role routing from Google Sheets

-- Make role_id nullable (not required when auto-detecting roles)
ALTER TABLE "connected_sheets" ALTER COLUMN "role_id" DROP NOT NULL;

-- Add auto_detect_role flag
ALTER TABLE "connected_sheets" ADD COLUMN "auto_detect_role" boolean DEFAULT false NOT NULL;

-- Add role_column_index to track which column has role data
ALTER TABLE "connected_sheets" ADD COLUMN "role_column_index" integer;
