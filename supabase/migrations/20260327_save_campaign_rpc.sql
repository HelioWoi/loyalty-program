-- RPC to save campaign settings (SECURITY DEFINER bypasses RLS)
DROP FUNCTION IF EXISTS save_campaign_settings(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION save_campaign_settings(
  p_campaign_id UUID,
  p_campaign_name TEXT,
  p_points_per_checkin INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE loyalty_campaigns
  SET campaign_name = p_campaign_name,
      points_per_checkin = p_points_per_checkin,
      updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RPC to upsert a reward (SECURITY DEFINER bypasses RLS)
DROP FUNCTION IF EXISTS save_reward(UUID, UUID, TEXT, INTEGER, TEXT, BOOLEAN, INTEGER);

CREATE OR REPLACE FUNCTION save_reward(
  p_reward_id UUID,
  p_campaign_id UUID,
  p_name TEXT,
  p_points_required INTEGER,
  p_description TEXT,
  p_active BOOLEAN,
  p_sort_order INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try update first
  UPDATE loyalty_rewards
  SET name = p_name,
      points_required = p_points_required,
      description = p_description,
      active = p_active,
      sort_order = p_sort_order
  WHERE id = p_reward_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'id', p_reward_id);
  END IF;

  -- If not found, insert new
  INSERT INTO loyalty_rewards (campaign_id, name, points_required, description, active, sort_order)
  VALUES (p_campaign_id, p_name, p_points_required, p_description, p_active, p_sort_order)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
