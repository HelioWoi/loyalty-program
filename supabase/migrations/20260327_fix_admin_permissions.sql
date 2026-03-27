-- =============================================
-- FIX: Admin dashboard permissions for saving
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Grant table-level permissions to anon role
GRANT SELECT, UPDATE ON loyalty_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON loyalty_rewards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON member_rewards TO anon;

-- 2. Re-create open RLS policies (permissive - OR'd with any existing policies)
DROP POLICY IF EXISTS "Anyone can read campaigns" ON loyalty_campaigns;
CREATE POLICY "Anyone can read campaigns" ON loyalty_campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update campaigns" ON loyalty_campaigns;
CREATE POLICY "Anyone can update campaigns" ON loyalty_campaigns FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read rewards" ON loyalty_rewards;
CREATE POLICY "Anyone can read rewards" ON loyalty_rewards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage rewards" ON loyalty_rewards;
CREATE POLICY "Anyone can manage rewards" ON loyalty_rewards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can manage member_rewards" ON member_rewards;
CREATE POLICY "Anyone can manage member_rewards" ON member_rewards FOR ALL USING (true) WITH CHECK (true);
