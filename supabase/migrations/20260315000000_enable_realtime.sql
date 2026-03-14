-- Enable Supabase Realtime on tables that need live updates.
-- This adds each table to the supabase_realtime publication so
-- postgres_changes events are broadcast to subscribed clients.

alter publication supabase_realtime add table candidates;
alter publication supabase_realtime add table candidate_comments;
alter publication supabase_realtime add table roles;
alter publication supabase_realtime add table activities;
