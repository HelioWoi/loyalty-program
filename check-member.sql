-- ============================================
-- CHECK IF MEMBER EXISTS
-- ============================================
-- Replace 'your-email@example.com' with your actual email

-- Check if member exists
SELECT 
  id,
  full_name,
  email,
  points,
  visits_count,
  venue,
  created_at
FROM coffee_club_members 
WHERE email = 'heliowoi@gmail.com' 
  OR email ILIKE '%helio%'
ORDER BY created_at DESC;

-- Check all members for this venue
SELECT 
  id,
  full_name,
  email,
  points,
  visits_count,
  created_at
FROM coffee_club_members 
WHERE venue = 'Backstreet Cafe'
ORDER BY created_at DESC;

-- Check all check-ins for today
SELECT 
  ci.id,
  ci.member_id,
  m.full_name,
  m.email,
  ci.points_earned,
  ci.checked_in_at
FROM check_ins ci
JOIN coffee_club_members m ON ci.member_id = m.id
WHERE ci.checked_in_at >= CURRENT_DATE
ORDER BY ci.checked_in_at DESC;
