-- Add last_check_in column (constraint already exists)
ALTER TABLE coffee_club_members 
ADD COLUMN IF NOT EXISTS last_check_in TIMESTAMP WITH TIME ZONE;

-- Update existing members with their last check-in
UPDATE coffee_club_members m
SET last_check_in = (
  SELECT MAX(checked_in_at) 
  FROM check_ins c 
  WHERE c.member_id = m.id
);

-- Create index for faster check-in lookups
CREATE INDEX IF NOT EXISTS idx_check_ins_member_date 
ON check_ins(member_id, checked_in_at DESC);
