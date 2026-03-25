-- Clean User Data for Fresh Start
-- This script removes all user data while keeping the system structure
-- Run this in Supabase SQL Editor to start fresh with user data

-- Disable foreign key constraints temporarily
SET session_replication_role = replica;

-- Clear all user-related data (in correct order to respect foreign keys)
DELETE FROM check_ins;
DELETE FROM redemptions;
DELETE FROM coffee_club_members;
DELETE FROM loyalty_rewards;
DELETE FROM loyalty_campaigns;
DELETE FROM venues;
DELETE FROM venue_owners;

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Verify all user data tables are empty
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

-- System is now clean and ready for fresh user registration
-- All previous emails, members, and cafe registrations have been removed
-- You can now start fresh with new owner signup and cafe registration
