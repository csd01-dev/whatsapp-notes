-- WhatsApp Notes App Schema
-- Run this in your Supabase SQL Editor
-- Uses wa_ prefix to avoid conflicts with other projects on same Supabase instance

-- ─────────────────────────────────────────
-- Users (identified by WhatsApp phone number)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_users (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone       TEXT UNIQUE NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Notes
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES wa_users(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL,
  summary     TEXT NOT NULL DEFAULT '',
  tags        TEXT[] DEFAULT '{}',
  source      TEXT DEFAULT 'text',   -- 'text' | 'voice'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_notes_user_id     ON wa_notes(user_id);
CREATE INDEX IF NOT EXISTS wa_notes_created_at  ON wa_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS wa_notes_tags        ON wa_notes USING gin(tags);

-- ─────────────────────────────────────────
-- Conversation history (for Claude context)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES wa_users(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_conv_user_id    ON wa_conversations(user_id);
CREATE INDEX IF NOT EXISTS wa_conv_created_at ON wa_conversations(created_at DESC);

-- ─────────────────────────────────────────
-- Disable RLS (personal app — no need for row-level security)
-- ─────────────────────────────────────────
ALTER TABLE wa_users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE wa_notes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations DISABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on notes
CREATE OR REPLACE FUNCTION update_wa_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wa_notes_updated_at ON wa_notes;
CREATE TRIGGER wa_notes_updated_at
  BEFORE UPDATE ON wa_notes
  FOR EACH ROW EXECUTE FUNCTION update_wa_notes_updated_at();
