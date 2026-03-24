-- ============================================
-- RESTORE DEFAULT CAMPAIGN AND REWARDS
-- ============================================
-- Run this after resetting data to restore the default campaign
-- ============================================

-- 1. Insert default campaign
INSERT INTO loyalty_campaigns (
  campaign_name,
  points_per_checkin,
  venue_id,
  active,
  logo_url
) VALUES (
  'BACKSTREET POINTS CLUB',
  5,
  'backstreet-cafe',
  true,
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/backstreet-logo-round-4pJXqKvQGcHJX8xvxvxvxvxvxv.png'
) 
ON CONFLICT (venue_id) DO UPDATE SET
  campaign_name = EXCLUDED.campaign_name,
  points_per_checkin = EXCLUDED.points_per_checkin,
  active = EXCLUDED.active,
  logo_url = EXCLUDED.logo_url
RETURNING id;

-- 2. Get the campaign ID (you'll need to replace <campaign_id> below with the actual ID)
-- Or run this query to get it:
SELECT id FROM loyalty_campaigns WHERE venue_id = 'backstreet-cafe';

-- 3. Insert default rewards
-- IMPORTANT: Replace <campaign_id> with the actual campaign ID from step 2
-- Example: If the campaign ID is '123e4567-e89b-12d3-a456-426614174000', replace all instances below

INSERT INTO loyalty_rewards (campaign_id, name, description, points_required, active, sort_order) VALUES
('<campaign_id>', 'Free Coffee', 'Enjoy a complimentary coffee on us', 50, true, 1),
('<campaign_id>', 'Banana Bread Reward', 'Get a free slice of our famous banana bread', 70, true, 2),
('<campaign_id>', 'Signature Smash Reward', 'Redeem for our signature smash breakfast', 100, true, 3),
('<campaign_id>', 'Burger + Coffee Combo', 'Get a burger and coffee combo', 150, true, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify the campaign and rewards were created:

SELECT * FROM loyalty_campaigns WHERE venue_id = 'backstreet-cafe';
SELECT * FROM loyalty_rewards WHERE campaign_id IN (SELECT id FROM loyalty_campaigns WHERE venue_id = 'backstreet-cafe');
