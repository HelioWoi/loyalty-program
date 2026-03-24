-- ============================================
-- QUICK RESTORE - Campaign + Rewards in one go
-- ============================================

-- Step 1: Delete existing campaign for this venue (if any)
DELETE FROM loyalty_campaigns WHERE venue_id = 'backstreet-cafe';

-- Step 2: Insert new campaign and get the ID
WITH new_campaign AS (
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
  RETURNING id
)
-- Step 2: Insert all rewards using the campaign ID
INSERT INTO loyalty_rewards (campaign_id, name, description, points_required, active, sort_order)
SELECT 
  new_campaign.id,
  reward.name,
  reward.description,
  reward.points_required,
  reward.active,
  reward.sort_order
FROM new_campaign,
(VALUES
  ('Free Coffee', 'Enjoy a complimentary coffee on us', 50, true, 1),
  ('Banana Bread Reward', 'Get a free slice of our famous banana bread', 70, true, 2),
  ('Signature Smash Reward', 'Redeem for our signature smash breakfast', 100, true, 3),
  ('Burger + Coffee Combo', 'Get a burger and coffee combo', 150, true, 4)
) AS reward(name, description, points_required, active, sort_order)
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Campaign created:' as status, * FROM loyalty_campaigns WHERE venue_id = 'backstreet-cafe';
SELECT 'Rewards created:' as status, count(*) as total FROM loyalty_rewards 
WHERE campaign_id IN (SELECT id FROM loyalty_campaigns WHERE venue_id = 'backstreet-cafe');
