-- ============================================
-- VERIFY DATABASE IS CLEAN
-- ============================================

-- Check for any members with heliowoi email
SELECT * FROM coffee_club_members WHERE email ILIKE '%helio%';

-- Check total members
SELECT COUNT(*) as total_members FROM coffee_club_members;

-- Check total check-ins
SELECT COUNT(*) as total_checkins FROM check_ins;

-- Check for orphaned check-ins (check-ins without members)
SELECT ci.* 
FROM check_ins ci
LEFT JOIN coffee_club_members m ON ci.member_id = m.id
WHERE m.id IS NULL;

-- If you see orphaned check-ins, delete them:
-- DELETE FROM check_ins WHERE member_id NOT IN (SELECT id FROM coffee_club_members);
