-- Candidates (most critical)
CREATE INDEX IF NOT EXISTS candidates_role_id_idx ON candidates (role_id);
CREATE INDEX IF NOT EXISTS candidates_is_deleted_idx ON candidates (is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS candidates_role_deleted_idx ON candidates (role_id, is_deleted);
CREATE INDEX IF NOT EXISTS candidates_status_deleted_idx ON candidates (status, is_deleted);
CREATE INDEX IF NOT EXISTS candidates_email_idx ON candidates (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS candidates_phone_idx ON candidates (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS candidates_import_batch_idx ON candidates (import_batch_id);
CREATE INDEX IF NOT EXISTS candidates_updated_at_idx ON candidates (updated_at DESC);
CREATE INDEX IF NOT EXISTS candidates_created_at_idx ON candidates (created_at DESC);

-- Candidate events
CREATE INDEX IF NOT EXISTS candidate_events_candidate_id_idx ON candidate_events (candidate_id);

-- Candidate comments
CREATE INDEX IF NOT EXISTS candidate_comments_candidate_id_idx ON candidate_comments (candidate_id);

-- Activities
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities (created_at DESC);
CREATE INDEX IF NOT EXISTS activities_candidate_id_idx ON activities (candidate_id);

-- Team members
CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_id_idx ON team_members (user_id);
CREATE INDEX IF NOT EXISTS team_members_email_idx ON team_members (email);
CREATE INDEX IF NOT EXISTS team_members_is_active_idx ON team_members (is_active) WHERE is_active = true;

-- Invitations
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations (email);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_idx ON invitations (token);

-- Extraction drafts
CREATE INDEX IF NOT EXISTS extraction_drafts_batch_id_idx ON extraction_drafts (import_batch_id);
CREATE INDEX IF NOT EXISTS extraction_drafts_status_idx ON extraction_drafts (status);

-- Import batches
CREATE INDEX IF NOT EXISTS import_batches_role_id_idx ON import_batches (role_id);
