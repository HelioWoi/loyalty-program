-- Reset Database for Production
-- This script will clean all data while preserving the structure
-- Run this in Supabase SQL Editor to start fresh production testing

-- Disable foreign key constraints temporarily
SET session_replication_role = replica;

-- Clear all data from tables (in correct order to respect foreign keys)
DELETE FROM check_ins;
DELETE FROM redemptions;
DELETE FROM coffee_club_members;
DELETE FROM loyalty_rewards;
DELETE FROM loyalty_campaigns;
DELETE FROM venues;
DELETE FROM venue_owners;

-- Reset auto-increment counters
ALTER SEQUENCE venues_id_seq RESTART WITH 1;
ALTER SEQUENCE venue_owners_id_seq RESTART WITH 1;
ALTER SEQUENCE coffee_club_members_id_seq RESTART WITH 1;
ALTER SEQUENCE loyalty_campaigns_id_seq RESTART WITH 1;
ALTER SEQUENCE loyalty_rewards_id_seq RESTART WITH 1;
ALTER SEQUENCE check_ins_id_seq RESTART WITH 1;
ALTER SEQUENCE redemptions_id_seq RESTART WITH 1;

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Verify tables are empty
SELECT 'venues' as table_name, COUNT(*) as row_count FROM venues
UNION ALL
SELECT 'venue_owners' as table_name, COUNT(*) as row_count FROM venue_owners
UNION ALL
SELECT 'coffee_club_members' as table_name, COUNT(*) as row_count FROM coffee_club_members
UNION ALL
SELECT 'loyalty_campaigns' as table_name, COUNT(*) as row_count FROM loyalty_campaigns
UNION ALL
SELECT 'loyalty_rewards' as table_name, COUNT(*) as row_count FROM loyalty_rewards
UNION ALL
SELECT 'check_ins' as table_name, COUNT(*) as row_count FROM check_ins
UNION ALL
SELECT 'redemptions' as table_name, COUNT(*) as row_count FROM redemptions;

-- Database is now ready for production testing
-- All tables are empty and ready for new data
