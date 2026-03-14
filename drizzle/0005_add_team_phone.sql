-- Add phone and whatsapp_enabled columns to team_members
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "whatsapp_enabled" boolean DEFAULT false NOT NULL;
