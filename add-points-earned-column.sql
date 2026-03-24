-- ============================================
-- ADD points_earned COLUMN TO check_ins
-- ============================================
-- This column tracks how many points were earned per check-in

-- Add points_earned column if it doesn't exist
ALTER TABLE check_ins 
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 5;

-- Add venue_id column if it doesn't exist (for consistency)
ALTER TABLE check_ins 
ADD COLUMN IF NOT EXISTS venue_id TEXT;

-- Update existing check-ins to have points_earned = 5
UPDATE check_ins 
SET points_earned = 5 
WHERE points_earned IS NULL;

-- Verify
SELECT 
  id,
  member_id,
  venue,
  venue_id,
  points_earned,
  checked_in_at
FROM check_ins
ORDER BY checked_in_at DESC
LIMIT 10;
