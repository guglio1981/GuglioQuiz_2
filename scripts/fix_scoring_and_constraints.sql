-- ==========================================
-- Fix scoring synchronization for GuglioQuiz
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Remove CHECK constraint on score >= 0 (if it exists)
-- This allows negative scores from wrong answers.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'players'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%score%0%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE players DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No score >= 0 constraint found (OK)';
  END IF;
END $$;

-- 2. Create or replace the atomic increment_player_score RPC
-- This avoids read-modify-write race conditions.
CREATE OR REPLACE FUNCTION increment_player_score(player_id uuid, points int)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE players
  SET score = score + points
  WHERE id = player_id;
$$;

-- 3. Add points_processed column to answers table (idempotency flag)
-- Prevents double-processing of the same answer.
ALTER TABLE answers ADD COLUMN IF NOT EXISTS points_processed boolean DEFAULT false;

-- 4. Grant execute permission on the RPC to anon and authenticated roles
GRANT EXECUTE ON FUNCTION increment_player_score(uuid, int) TO anon;
GRANT EXECUTE ON FUNCTION increment_player_score(uuid, int) TO authenticated;
