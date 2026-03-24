-- ============================================
-- BACKSTREET POINTS CLUB - Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add points column to existing members table
ALTER TABLE coffee_club_members 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. Create loyalty_campaigns table
CREATE TABLE IF NOT EXISTS loyalty_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id TEXT NOT NULL DEFAULT 'backstreet-cafe',
  campaign_name TEXT NOT NULL DEFAULT 'Backstreet Points Club',
  points_per_checkin INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create loyalty_rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES loyalty_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create member_rewards table (tracks reward status per user)
CREATE TABLE IF NOT EXISTS member_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES coffee_club_members(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'redeemed')),
  unlocked_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(member_id, reward_id)
);

-- 5. Insert default campaign
INSERT INTO loyalty_campaigns (venue_id, campaign_name, points_per_checkin)
VALUES ('backstreet-cafe', 'Backstreet Points Club', 5)
ON CONFLICT DO NOTHING;

-- 6. Insert default rewards (get campaign_id first)
DO $$
DECLARE
  camp_id UUID;
BEGIN
  SELECT id INTO camp_id FROM loyalty_campaigns WHERE venue_id = 'backstreet-cafe' LIMIT 1;
  
  INSERT INTO loyalty_rewards (campaign_id, name, points_required, description, sort_order, active)
  VALUES 
    (camp_id, 'Free Coffee', 50, 'Enjoy a free coffee on us', 1, true),
    (camp_id, 'Banana Bread Reward', 70, 'Unlock a delicious Banana Bread', 2, true),
    (camp_id, 'Signature Smash Reward', 100, 'Claim a free Signature Smash burger', 3, true),
    (camp_id, 'Burger + Coffee Combo', 150, 'Enjoy a Signature Smash and coffee combo', 4, true)
  ON CONFLICT DO NOTHING;
END $$;

-- 7. Sync existing members: convert visits_count to points (visits * 5)
UPDATE coffee_club_members 
SET points = visits_count * 5
WHERE points = 0 AND visits_count > 0;

-- 8. RLS Policies for new tables
ALTER TABLE loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_rewards ENABLE ROW LEVEL SECURITY;

-- Campaigns: anyone can read
DROP POLICY IF EXISTS "Anyone can read campaigns" ON loyalty_campaigns;
CREATE POLICY "Anyone can read campaigns" ON loyalty_campaigns FOR SELECT USING (true);

-- Campaigns: anyone can update (for admin dashboard - in production use proper auth)
DROP POLICY IF EXISTS "Anyone can update campaigns" ON loyalty_campaigns;
CREATE POLICY "Anyone can update campaigns" ON loyalty_campaigns FOR UPDATE USING (true);

-- Rewards: anyone can read
DROP POLICY IF EXISTS "Anyone can read rewards" ON loyalty_rewards;
CREATE POLICY "Anyone can read rewards" ON loyalty_rewards FOR SELECT USING (true);

-- Rewards: anyone can insert/update/delete (for admin)
DROP POLICY IF EXISTS "Anyone can manage rewards" ON loyalty_rewards;
CREATE POLICY "Anyone can manage rewards" ON loyalty_rewards FOR ALL USING (true);

-- Member rewards: anyone can read/insert/update
DROP POLICY IF EXISTS "Anyone can manage member_rewards" ON member_rewards;
CREATE POLICY "Anyone can manage member_rewards" ON member_rewards FOR ALL USING (true);

-- Grant permissions to anon role
GRANT SELECT ON loyalty_campaigns TO anon;
GRANT UPDATE ON loyalty_campaigns TO anon;
GRANT ALL ON loyalty_rewards TO anon;
GRANT ALL ON member_rewards TO anon;

-- 9. Create redemptions table (permanent history log)
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES coffee_club_members(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
  reward_name TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can manage redemptions" ON redemptions;
CREATE POLICY "Anyone can manage redemptions" ON redemptions FOR ALL USING (true);
GRANT ALL ON redemptions TO anon;

-- 10. Add logo_url to campaigns
ALTER TABLE loyalty_campaigns ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 11. Create venue_logos table for upload tracking
CREATE TABLE IF NOT EXISTS venue_logos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE venue_logos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can manage venue_logos" ON venue_logos;
CREATE POLICY "Anyone can manage venue_logos" ON venue_logos FOR ALL USING (true);
GRANT ALL ON venue_logos TO anon;

-- 12. Create insight_actions table (logs campaigns sent from Customer Insights)
CREATE TABLE IF NOT EXISTS insight_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id TEXT NOT NULL DEFAULT 'backstreet-cafe',
  action_type TEXT NOT NULL CHECK (action_type IN ('revenue_at_risk', 'conversion_opportunity', 'inactive_members')),
  message TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  recipient_ids UUID[] DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push', 'manual')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE insight_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can manage insight_actions" ON insight_actions;
CREATE POLICY "Anyone can manage insight_actions" ON insight_actions FOR ALL USING (true);
GRANT ALL ON insight_actions TO anon;

-- 13. Verify setup
SELECT 'Campaigns:' as info, count(*) as total FROM loyalty_campaigns;
SELECT 'Rewards:' as info, count(*) as total FROM loyalty_rewards;
SELECT 'Members with points:' as info, count(*) as total FROM coffee_club_members WHERE points > 0;
