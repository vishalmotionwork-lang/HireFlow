-- Migration: Create notifications table for in-app notification inbox
-- Supports @mention notifications, extensible for status_change and other types.

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "link" text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Index for fast lookup by recipient, ordered by recency
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notifications" ("user_id", "created_at" DESC);

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS "notifications_user_id_unread_idx"
  ON "notifications" ("user_id")
  WHERE "is_read" = false;
