-- ============================================
-- PASSO 3: CRIAR RLS POLICIES
-- ============================================
-- Execute este arquivo DEPOIS do step2-enable-rls.sql
-- ============================================

-- VENUE OWNERS POLICIES
CREATE POLICY "Owners can view their own data"
  ON venue_owners FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Owners can update their own data"
  ON venue_owners FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- VENUES POLICIES
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

CREATE POLICY "Public can view active venues"
  ON venues FOR SELECT
  USING (active = true);

-- LOYALTY CAMPAIGNS POLICIES
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

-- LOYALTY REWARDS POLICIES
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

-- COFFEE CLUB MEMBERS POLICIES
CREATE POLICY "Owners can view their venue members"
  ON coffee_club_members FOR SELECT
  USING (
    venue IN (
      SELECT v.venue_name FROM venues v
      JOIN venue_owners vo ON v.owner_id = vo.id
      WHERE vo.auth_user_id = auth.uid()
    )
  );

-- CHECK-INS POLICIES
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

-- REDEMPTIONS POLICIES
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

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Resultado esperado: 13 policies criadas
