-- Add avatar_url column to app_users table if it doesn't exist
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
