-- ============================================
-- PASSO 4: CRIAR FUNCTIONS HELPER
-- ============================================
-- Execute este arquivo DEPOIS do step3-create-policies.sql
-- ============================================

-- Function para pegar venues do owner
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

-- Function para criar novo venue para owner
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

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_owner_venues', 'create_venue_for_owner');

-- Resultado esperado: 2 functions
