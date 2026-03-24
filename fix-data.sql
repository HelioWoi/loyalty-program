-- Fix existing data: sync visits_count with actual check-ins
-- Execute este SQL no Supabase

-- 1. Atualizar visits_count baseado no número real de check-ins
UPDATE coffee_club_members m
SET 
  visits_count = (
    SELECT COUNT(*) FROM check_ins c WHERE c.member_id = m.id
  ),
  reward_status = CASE
    WHEN (SELECT COUNT(*) FROM check_ins c WHERE c.member_id = m.id) >= 10 THEN 'rewarded'
    WHEN (SELECT COUNT(*) FROM check_ins c WHERE c.member_id = m.id) >= 1 THEN 'active'
    ELSE 'new'
  END;

-- 2. Verificar resultado
SELECT full_name, email, visits_count, reward_status 
FROM coffee_club_members;

-- 3. Ver check-ins
SELECT c.*, m.full_name 
FROM check_ins c 
JOIN coffee_club_members m ON c.member_id = m.id
ORDER BY c.checked_in_at DESC;
