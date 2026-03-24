-- Security fixes for loyalty program

-- 1. Add unique constraint on email to prevent duplicates
ALTER TABLE coffee_club_members 
ADD CONSTRAINT unique_email_per_venue UNIQUE (email, venue);

-- 2. Add check-in cooldown: only 1 check-in per day per member
-- Create a function to check if member already checked in today
CREATE OR REPLACE FUNCTION has_checked_in_today(member_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM check_ins 
    WHERE member_id = member_uuid 
    AND checked_in_at >= CURRENT_DATE
    AND checked_in_at < CURRENT_DATE + INTERVAL '1 day'
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Create index for faster check-in lookups
CREATE INDEX IF NOT EXISTS idx_check_ins_member_date 
ON check_ins(member_id, checked_in_at DESC);

-- 4. Add last_check_in column to members for quick validation
ALTER TABLE coffee_club_members 
ADD COLUMN IF NOT EXISTS last_check_in TIMESTAMP WITH TIME ZONE;

-- Update existing members with their last check-in
UPDATE coffee_club_members m
SET last_check_in = (
  SELECT MAX(checked_in_at) 
  FROM check_ins c 
  WHERE c.member_id = m.id
);
