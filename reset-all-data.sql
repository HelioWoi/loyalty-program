-- ============================================
-- RESET ALL DATA - START FRESH
-- ============================================
-- WARNING: This will DELETE ALL data from the loyalty program
-- Use with caution! This cannot be undone.
-- ============================================

-- 1. Delete all redemptions (must be first due to foreign keys)
DELETE FROM redemptions;

-- 2. Delete all check-ins
DELETE FROM check_ins;

-- 3. Delete all member rewards
DELETE FROM member_rewards;

-- 4. Delete all members
DELETE FROM coffee_club_members;

-- 5. Delete all rewards
DELETE FROM loyalty_rewards;

-- 6. Delete all campaigns
DELETE FROM loyalty_campaigns;

-- 7. Delete all insight actions (if exists)
DELETE FROM insight_actions WHERE true;

-- 8. Reset sequences (optional - to start IDs from 1 again)
-- ALTER SEQUENCE coffee_club_members_id_seq RESTART WITH 1;
-- ALTER SEQUENCE check_ins_id_seq RESTART WITH 1;
-- ALTER SEQUENCE loyalty_rewards_id_seq RESTART WITH 1;
-- ALTER SEQUENCE loyalty_campaigns_id_seq RESTART WITH 1;
-- ALTER SEQUENCE redemptions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE member_rewards_id_seq RESTART WITH 1;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify all data is deleted:

SELECT COUNT(*) as members_count FROM coffee_club_members;
SELECT COUNT(*) as check_ins_count FROM check_ins;
SELECT COUNT(*) as rewards_count FROM loyalty_rewards;
SELECT COUNT(*) as campaigns_count FROM loyalty_campaigns;
SELECT COUNT(*) as redemptions_count FROM redemptions;
SELECT COUNT(*) as member_rewards_count FROM member_rewards;

-- ============================================
-- OPTIONAL: Re-create default campaign and rewards
-- ============================================
-- Uncomment below if you want to start with a fresh campaign

/*
-- Insert default campaign
INSERT INTO loyalty_campaigns (
  campaign_name,
  description,
  points_per_checkin,
  venue_id,
  is_active,
  logo_url
) VALUES (
  'BACKSTREET POINTS CLUB',
  'Earn points with every visit and unlock exclusive rewards',
  5,
  'backstreet-cafe',
  true,
  'https://your-logo-url.com/logo.png'
) RETURNING id;

-- Insert default rewards (replace <campaign_id> with the ID from above)
INSERT INTO loyalty_rewards (campaign_id, name, description, points_required, is_active) VALUES
(<campaign_id>, 'Free Coffee', 'Enjoy a complimentary coffee on us', 50, true),
(<campaign_id>, 'Banana Bread Reward', 'Get a free slice of our famous banana bread', 70, true),
(<campaign_id>, 'Signature Smash Reward', 'Redeem for our signature smash breakfast', 100, true),
(<campaign_id>, 'Burger + Coffee Combo', 'Get a burger and coffee combo', 150, true);
*/
