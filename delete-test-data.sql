-- ============================================
-- DELETE TEST DATA - Helio's Account
-- ============================================
-- This will remove all test data so clients can start fresh

-- Delete check-ins for test member
DELETE FROM check_ins 
WHERE member_id IN (
  SELECT id FROM coffee_club_members 
  WHERE email = 'heliowoi@gmail.com'
);

-- Delete member rewards for test member
DELETE FROM member_rewards 
WHERE member_id IN (
  SELECT id FROM coffee_club_members 
  WHERE email = 'heliowoi@gmail.com'
);

-- Delete redemptions for test member
DELETE FROM redemptions 
WHERE member_id IN (
  SELECT id FROM coffee_club_members 
  WHERE email = 'heliowoi@gmail.com'
);

-- Delete test member
DELETE FROM coffee_club_members 
WHERE email = 'heliowoi@gmail.com';

-- Verify deletion
SELECT COUNT(*) as remaining_members FROM coffee_club_members;
SELECT COUNT(*) as remaining_checkins FROM check_ins;
