-- Phase 3: Add Google Calendar token columns to wa_users
-- Run this in Supabase SQL Editor

ALTER TABLE wa_users
  ADD COLUMN IF NOT EXISTS google_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expiry  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_email         TEXT;
