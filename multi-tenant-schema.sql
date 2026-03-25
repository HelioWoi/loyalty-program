-- ============================================
-- MULTI-TENANT LOYALTY PROGRAM SCHEMA
-- ============================================
-- This schema supports multiple cafe owners, each with one or more venues
-- Includes authentication, data isolation, and multi-location support
-- ============================================

-- 1. VENUE OWNERS TABLE
-- Stores cafe owner accounts (uses Supabase Auth)
CREATE TABLE IF NOT EXISTS venue_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VENUES TABLE (Enhanced)
-- Each owner can have multiple venues/locations
CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY, -- e.g., 'backstreet-cafe', 'mooloo-brew'
  owner_id UUID REFERENCES venue_owners(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL, -- e.g., 'Backstreet Cafe'
  subdomain TEXT UNIQUE, -- e.g., 'backstreet' for backstreet.menulove.app
  logo_url TEXT,
  brand_colors JSONB DEFAULT '{
    "primary": "#3D2817",
    "secondary": "#2C1810",
    "accent": "#D4A574",
    "background": "#EDE8E3",
    "text": "#2C1810",
    "textLight": "#6B5D54",
    "textMuted": "#B5A89C"
  }'::jsonb,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Australia',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. UPDATE EXISTING TABLES TO INCLUDE PROPER VENUE_ID REFERENCES

-- Add owner_id to loyalty_campaigns (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='loyalty_campaigns' AND column_name='owner_id') THEN
    ALTER TABLE loyalty_campaigns ADD COLUMN owner_id UUID REFERENCES venue_owners(id);
  END IF;
END $$;

-- Ensure venue_id is properly set up
ALTER TABLE loyalty_campaigns 
  DROP CONSTRAINT IF EXISTS loyalty_campaigns_venue_id_fkey,
  ADD CONSTRAINT loyalty_campaigns_venue_id_fkey 
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE venue_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Venue Owners Policies
CREATE POLICY "Owners can view their own data"
  ON venue_owners FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Owners can update their own data"
  ON venue_owners FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- Venues Policies
CREATE POLICY "Owners can view their own venues"
  ON venues FOR SELECT
  USING (owner_id IN (
    SELECT id FROM venue_owners WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Owners can update their own venues"
  ON venues FOR UPDATE
  USING (owner_id IN (
    SELECT id FROM venue_owners WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Owners can insert new venues"
  ON venues FOR INSERT
  WITH CHECK (owner_id IN (
    SELECT id FROM venue_owners WHERE auth_user_id = auth.uid()
  ));

-- Public can view venues (for customer-facing pages)
CREATE POLICY "Public can view active venues"
  ON venues FOR SELECT
  USING (active = true);

-- Loyalty Campaigns Policies
CREATE POLICY "Owners can manage their venue campaigns"
  ON loyalty_campaigns FOR ALL
  USING (venue_id IN (
    SELECT v.id FROM venues v
    JOIN venue_owners vo ON v.owner_id = vo.id
    WHERE vo.auth_user_id = auth.uid()
  ));

CREATE POLICY "Public can view campaigns"
  ON loyalty_campaigns FOR SELECT
  USING (active = true);

-- Loyalty Rewards Policies
CREATE POLICY "Owners can manage their rewards"
  ON loyalty_rewards FOR ALL
  USING (campaign_id IN (
    SELECT lc.id FROM loyalty_campaigns lc
    JOIN venues v ON lc.venue_id = v.id
    JOIN venue_owners vo ON v.owner_id = vo.id
    WHERE vo.auth_user_id = auth.uid()
  ));

CREATE POLICY "Public can view active rewards"
  ON loyalty_rewards FOR SELECT
  USING (active = true);

-- Coffee Club Members Policies (already has public access for signup)
-- Keep existing policies, add owner view policy
CREATE POLICY "Owners can view their venue members"
  ON coffee_club_members FOR SELECT
  USING (
    venue IN (
      SELECT v.venue_name FROM venues v
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    )
  );

-- Check-ins Policies
CREATE POLICY "Owners can view their venue check-ins"
  ON check_ins FOR SELECT
  USING (
    member_id IN (
      SELECT m.id FROM coffee_club_members m
      WHERE m.venue IN (
        SELECT v.venue_name FROM venues v
        JOIN venue_owners vo ON v.owner_id = vo.id
        WHERE vo.auth_user_id = auth.uid()
      )
    )
  );

-- Redemptions Policies
CREATE POLICY "Owners can view their venue redemptions"
  ON redemptions FOR SELECT
  USING (
    member_id IN (
      SELECT m.id FROM coffee_club_members m
      WHERE m.venue IN (
        SELECT v.venue_name FROM venues v
        JOIN venue_owners vo ON v.owner_id = vo.id
        WHERE vo.auth_user_id = auth.uid()
      )
    )
  );

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_subdomain ON venues(subdomain);
CREATE INDEX IF NOT EXISTS idx_venue_owners_auth_user_id ON venue_owners(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_venue_id ON loyalty_campaigns(venue_id);
CREATE INDEX IF NOT EXISTS idx_coffee_club_members_venue ON coffee_club_members(venue);

-- 6. FUNCTIONS

-- Function to get owner's venues
CREATE OR REPLACE FUNCTION get_owner_venues()
RETURNS TABLE (
  venue_id TEXT,
  venue_name TEXT,
  subdomain TEXT,
  logo_url TEXT,
  active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.venue_name, v.subdomain, v.logo_url, v.active
  FROM venues v
  JOIN venue_owners vo ON v.owner_id = vo.id
  WHERE vo.auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new venue for owner
CREATE OR REPLACE FUNCTION create_venue_for_owner(
  p_venue_id TEXT,
  p_venue_name TEXT,
  p_subdomain TEXT
)
RETURNS UUID AS $$
DECLARE
  v_owner_id UUID;
  v_new_venue_id TEXT;
BEGIN
  -- Get owner_id from auth.uid()
  SELECT id INTO v_owner_id
  FROM venue_owners
  WHERE auth_user_id = auth.uid();

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner not found for current user';
  END IF;

  -- Insert new venue
  INSERT INTO venues (id, owner_id, venue_name, subdomain)
  VALUES (p_venue_id, v_owner_id, p_venue_name, p_subdomain)
  RETURNING id INTO v_new_venue_id;

  -- Create default campaign for venue
  INSERT INTO loyalty_campaigns (
    campaign_name,
    points_per_checkin,
    venue_id,
    owner_id,
    active
  ) VALUES (
    p_venue_name || ' POINTS CLUB',
    5,
    v_new_venue_id,
    v_owner_id,
    true
  );

  RETURN v_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. SEED DATA (Example - Backstreet Cafe)
-- This will be replaced by actual owner signups

-- Insert example owner (you'll replace this with real signup)
INSERT INTO venue_owners (id, full_name, email, phone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Owner',
  'demo@menulove.com',
  '+61400000000'
) ON CONFLICT (email) DO NOTHING;

-- Insert example venue
INSERT INTO venues (id, owner_id, venue_name, subdomain, logo_url)
VALUES (
  'backstreet-cafe',
  '00000000-0000-0000-0000-000000000001',
  'Backstreet Cafe',
  'backstreet',
  'https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/logo.png'
) ON CONFLICT (id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  venue_name = EXCLUDED.venue_name;

-- Update existing campaign to link to owner
UPDATE loyalty_campaigns
SET owner_id = '00000000-0000-0000-0000-000000000001'
WHERE venue_id = 'backstreet-cafe';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify setup:

-- Check owners
-- SELECT * FROM venue_owners;

-- Check venues
-- SELECT * FROM venues;

-- Check campaigns with owner info
-- SELECT lc.*, v.venue_name, vo.full_name as owner_name
-- FROM loyalty_campaigns lc
-- JOIN venues v ON lc.venue_id = v.id
-- JOIN venue_owners vo ON v.owner_id = vo.id;
