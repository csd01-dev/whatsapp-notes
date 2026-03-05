-- Phase 2: Add wa_tasks table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wa_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES wa_users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  due_date     TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  priority     TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_tasks_user_id_idx  ON wa_tasks(user_id);
CREATE INDEX IF NOT EXISTS wa_tasks_due_date_idx ON wa_tasks(due_date);
CREATE INDEX IF NOT EXISTS wa_tasks_completed_idx ON wa_tasks(user_id, is_completed);

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_wa_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wa_tasks_updated_at ON wa_tasks;
CREATE TRIGGER wa_tasks_updated_at
  BEFORE UPDATE ON wa_tasks
  FOR EACH ROW EXECUTE FUNCTION update_wa_tasks_updated_at();
