-- Schema v4: Add reminder_sent_at to wa_tasks for WhatsApp reminder cron job

ALTER TABLE wa_tasks
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Index for the cron query: tasks with upcoming due dates where reminder hasn't been sent
CREATE INDEX IF NOT EXISTS wa_tasks_reminder_idx
  ON wa_tasks (due_date, reminder_sent_at)
  WHERE is_completed = FALSE AND reminder_sent_at IS NULL;
