-- ============================================
-- COMPLETE RLS POLICIES FIX
-- ============================================
-- Este arquivo adiciona TODAS as policies necessárias
-- para o sistema multi-tenant funcionar completamente
-- ============================================

-- ============================================
-- 1. VENUE_OWNERS POLICIES
-- ============================================

-- Allow public signup (INSERT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_owners' AND policyname = 'Allow public signup') THEN
    CREATE POLICY "Allow public signup" ON venue_owners FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Owners can view their own data (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_owners' AND policyname = 'Owners can view their own data') THEN
    CREATE POLICY "Owners can view their own data" ON venue_owners FOR SELECT USING (auth.uid() = auth_user_id);
  END IF;
END $$;

-- Owners can update their own data (UPDATE)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_owners' AND policyname = 'Owners can update their own data') THEN
    CREATE POLICY "Owners can update their own data" ON venue_owners FOR UPDATE USING (auth.uid() = auth_user_id);
  END IF;
END $$;

-- ============================================
-- 2. VENUES POLICIES
-- ============================================

-- Owners can view their own venues (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'Owners can view their own venues') THEN
    CREATE POLICY "Owners can view their own venues" ON venues FOR SELECT 
    USING (owner_id IN (SELECT id FROM venue_owners WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

-- Owners can insert new venues (INSERT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'Owners can insert new venues') THEN
    CREATE POLICY "Owners can insert new venues" ON venues FOR INSERT 
    WITH CHECK (owner_id IN (SELECT id FROM venue_owners WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

-- Owners can update their own venues (UPDATE)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'Owners can update their own venues') THEN
    CREATE POLICY "Owners can update their own venues" ON venues FOR UPDATE 
    USING (owner_id IN (SELECT id FROM venue_owners WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

-- Public can view active venues (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venues' AND policyname = 'Public can view active venues') THEN
    CREATE POLICY "Public can view active venues" ON venues FOR SELECT USING (active = true);
  END IF;
END $$;

-- ============================================
-- 3. LOYALTY_CAMPAIGNS POLICIES
-- ============================================

-- Owners can manage their venue campaigns (ALL)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_campaigns' AND policyname = 'Owners can manage their venue campaigns') THEN
    CREATE POLICY "Owners can manage their venue campaigns" ON loyalty_campaigns FOR ALL 
    USING (venue_id IN (
      SELECT v.id FROM venues v
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Public can view campaigns (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_campaigns' AND policyname = 'Public can view campaigns') THEN
    CREATE POLICY "Public can view campaigns" ON loyalty_campaigns FOR SELECT USING (active = true);
  END IF;
END $$;

-- ============================================
-- 4. LOYALTY_REWARDS POLICIES (COMPLETE)
-- ============================================

-- Owners can view rewards (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_rewards' AND policyname = 'Owners can view rewards') THEN
    CREATE POLICY "Owners can view rewards" ON loyalty_rewards FOR SELECT 
    USING (campaign_id IN (
      SELECT lc.id FROM loyalty_campaigns lc
      JOIN venues v ON lc.venue_id = v.id
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Owners can insert rewards (INSERT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_rewards' AND policyname = 'Owners can insert rewards') THEN
    CREATE POLICY "Owners can insert rewards" ON loyalty_rewards FOR INSERT 
    WITH CHECK (campaign_id IN (
      SELECT lc.id FROM loyalty_campaigns lc
      JOIN venues v ON lc.venue_id = v.id
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Owners can update rewards (UPDATE)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_rewards' AND policyname = 'Owners can update rewards') THEN
    CREATE POLICY "Owners can update rewards" ON loyalty_rewards FOR UPDATE 
    USING (campaign_id IN (
      SELECT lc.id FROM loyalty_campaigns lc
      JOIN venues v ON lc.venue_id = v.id
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Owners can delete rewards (DELETE)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_rewards' AND policyname = 'Owners can delete rewards') THEN
    CREATE POLICY "Owners can delete rewards" ON loyalty_rewards FOR DELETE 
    USING (campaign_id IN (
      SELECT lc.id FROM loyalty_campaigns lc
      JOIN venues v ON lc.venue_id = v.id
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Public can view active rewards (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_rewards' AND policyname = 'Public can view active rewards') THEN
    CREATE POLICY "Public can view active rewards" ON loyalty_rewards FOR SELECT USING (active = true);
  END IF;
END $$;

-- ============================================
-- 5. COFFEE_CLUB_MEMBERS POLICIES
-- ============================================

-- Owners can view their venue members (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coffee_club_members' AND policyname = 'Owners can view their venue members') THEN
    CREATE POLICY "Owners can view their venue members" ON coffee_club_members FOR SELECT 
    USING (venue IN (
      SELECT v.venue_name FROM venues v
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Owners can update their venue members (UPDATE)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coffee_club_members' AND policyname = 'Owners can update their venue members') THEN
    CREATE POLICY "Owners can update their venue members" ON coffee_club_members FOR UPDATE 
    USING (venue IN (
      SELECT v.venue_name FROM venues v
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Public can insert members (INSERT - for signup)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coffee_club_members' AND policyname = 'Public can insert members') THEN
    CREATE POLICY "Public can insert members" ON coffee_club_members FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Members can view their own data (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coffee_club_members' AND policyname = 'Members can view their own data') THEN
    CREATE POLICY "Members can view their own data" ON coffee_club_members FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================
-- 6. CHECK_INS POLICIES
-- ============================================

-- Owners can view their venue check-ins (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'check_ins' AND policyname = 'Owners can view their venue check-ins') THEN
    CREATE POLICY "Owners can view their venue check-ins" ON check_ins FOR SELECT 
    USING (member_id IN (
      SELECT m.id FROM coffee_club_members m
      JOIN venues v ON m.venue = v.venue_name
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Public can insert check-ins (INSERT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'check_ins' AND policyname = 'Public can insert check-ins') THEN
    CREATE POLICY "Public can insert check-ins" ON check_ins FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Members can view their own check-ins (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'check_ins' AND policyname = 'Members can view their own check-ins') THEN
    CREATE POLICY "Members can view their own check-ins" ON check_ins FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================
-- 7. REDEMPTIONS POLICIES
-- ============================================

-- Owners can view their venue redemptions (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'redemptions' AND policyname = 'Owners can view their venue redemptions') THEN
    CREATE POLICY "Owners can view their venue redemptions" ON redemptions FOR SELECT 
    USING (member_id IN (
      SELECT m.id FROM coffee_club_members m
      JOIN venues v ON m.venue = v.venue_name
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    ));
  END IF;
END $$;

-- Public can insert redemptions (INSERT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'redemptions' AND policyname = 'Public can insert redemptions') THEN
    CREATE POLICY "Public can insert redemptions" ON redemptions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Members can view their own redemptions (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'redemptions' AND policyname = 'Members can view their own redemptions') THEN
    CREATE POLICY "Members can view their own redemptions" ON redemptions FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================
-- 8. MEMBER_REWARDS POLICIES
-- ============================================

-- Public can manage member rewards (ALL - for customer app)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member_rewards' AND policyname = 'Public can manage member rewards') THEN
    CREATE POLICY "Public can manage member rewards" ON member_rewards FOR ALL USING (true);
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Execute para verificar todas as policies criadas

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Update'
    WHEN cmd = 'DELETE' THEN 'Delete'
    WHEN cmd = 'ALL' THEN 'All Operations'
  END as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'venue_owners',
    'venues', 
    'loyalty_campaigns',
    'loyalty_rewards',
    'coffee_club_members',
    'check_ins',
    'redemptions',
    'member_rewards'
  )
ORDER BY tablename, cmd, policyname;

-- Resultado esperado:
-- venue_owners: 3 policies (INSERT, SELECT, UPDATE)
-- venues: 4 policies (INSERT, SELECT x2, UPDATE)
-- loyalty_campaigns: 2 policies (ALL, SELECT)
-- loyalty_rewards: 5 policies (SELECT x2, INSERT, UPDATE, DELETE)
-- coffee_club_members: 4 policies (SELECT x2, INSERT, UPDATE)
-- check_ins: 3 policies (SELECT x2, INSERT)
-- redemptions: 3 policies (SELECT x2, INSERT)
-- member_rewards: 1 policy (ALL)
