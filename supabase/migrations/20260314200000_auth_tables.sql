CREATE TABLE IF NOT EXISTS "team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "avatar" text,
  "role" text NOT NULL DEFAULT 'viewer',
  "is_active" boolean NOT NULL DEFAULT true,
  "invited_by" text,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "role" text NOT NULL DEFAULT 'viewer',
  "invited_by" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
