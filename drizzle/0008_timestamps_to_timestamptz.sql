-- Convert all timestamp columns to timestamptz across all tables

-- roles
ALTER TABLE roles ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE roles ALTER COLUMN updated_at TYPE timestamptz;

-- import_batches
ALTER TABLE import_batches ALTER COLUMN created_at TYPE timestamptz;

-- candidates
ALTER TABLE candidates ALTER COLUMN rejection_marked_at TYPE timestamptz;
ALTER TABLE candidates ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE candidates ALTER COLUMN updated_at TYPE timestamptz;

-- candidate_events
ALTER TABLE candidate_events ALTER COLUMN created_at TYPE timestamptz;

-- candidate_comments
ALTER TABLE candidate_comments ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE candidate_comments ALTER COLUMN edited_at TYPE timestamptz;

-- extraction_drafts
ALTER TABLE extraction_drafts ALTER COLUMN reviewed_at TYPE timestamptz;
ALTER TABLE extraction_drafts ALTER COLUMN applied_at TYPE timestamptz;
ALTER TABLE extraction_drafts ALTER COLUMN created_at TYPE timestamptz;

-- team_members
ALTER TABLE team_members ALTER COLUMN joined_at TYPE timestamptz;
ALTER TABLE team_members ALTER COLUMN created_at TYPE timestamptz;

-- invitations
ALTER TABLE invitations ALTER COLUMN expires_at TYPE timestamptz;
ALTER TABLE invitations ALTER COLUMN created_at TYPE timestamptz;

-- notifications
ALTER TABLE notifications ALTER COLUMN created_at TYPE timestamptz;

-- connected_sheets
ALTER TABLE connected_sheets ALTER COLUMN last_sync_at TYPE timestamptz;
ALTER TABLE connected_sheets ALTER COLUMN created_at TYPE timestamptz;

-- activities
ALTER TABLE activities ALTER COLUMN created_at TYPE timestamptz;
