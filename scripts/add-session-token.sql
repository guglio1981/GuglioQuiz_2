-- Add session_token column to app_users table for single-device login
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS session_token TEXT;
