-- ============================================
-- CLEAN ALL TEST DATA - Complete Reset
-- ============================================
-- This will remove ALL members and related data
-- Use this to start fresh with real customer data
-- ============================================

-- 1. Delete ALL check-ins (not just for specific member)
DELETE FROM check_ins;

-- 2. Delete ALL member rewards
DELETE FROM member_rewards;

-- 3. Delete ALL redemptions
DELETE FROM redemptions;

-- 4. Delete ALL members
DELETE FROM coffee_club_members;

-- 5. Delete ALL insight actions
DELETE FROM insight_actions;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify everything is clean:

SELECT COUNT(*) as members_count FROM coffee_club_members;
SELECT COUNT(*) as check_ins_count FROM check_ins;
SELECT COUNT(*) as member_rewards_count FROM member_rewards;
SELECT COUNT(*) as redemptions_count FROM redemptions;

-- Should all return 0

-- ============================================
-- WHAT REMAINS (Campaign and Rewards stay)
-- ============================================
SELECT COUNT(*) as campaigns_count FROM loyalty_campaigns;
SELECT COUNT(*) as rewards_count FROM loyalty_rewards;

-- These should still have data (your campaign setup)
