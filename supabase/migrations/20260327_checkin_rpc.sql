-- RPC function to perform a check-in and update member points
-- Runs with SECURITY DEFINER to bypass RLS (public users can't UPDATE members directly)
-- Drop old version if exists (in case of parameter change)
DROP FUNCTION IF EXISTS perform_checkin(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION perform_checkin(
  p_member_id UUID,
  p_venue_id UUID,
  p_points_to_add INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_existing_checkin RECORD;
  v_new_points INTEGER;
  v_new_visits INTEGER;
  v_member RECORD;
  v_venue_name TEXT;
BEGIN
  -- Check if already checked in today
  SELECT * INTO v_existing_checkin
  FROM check_ins
  WHERE member_id = p_member_id
    AND checked_in_at::date = v_today
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', 'You already checked in today! Come back tomorrow for more points.'
    );
  END IF;

  -- Get current member data
  SELECT * INTO v_member
  FROM coffee_club_members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'member_not_found',
      'message', 'Member not found'
    );
  END IF;

  -- Get venue name for check_ins table (column is 'venue TEXT NOT NULL')
  SELECT venue_name INTO v_venue_name FROM venues WHERE id = p_venue_id;
  IF v_venue_name IS NULL THEN
    v_venue_name := 'Check-in';
  END IF;

  -- Calculate new values
  v_new_points := COALESCE(v_member.points, 0) + p_points_to_add;
  v_new_visits := COALESCE(v_member.visits_count, 0) + 1;

  -- Insert check-in record (uses 'venue' TEXT column, not 'venue_id')
  INSERT INTO check_ins (member_id, venue)
  VALUES (p_member_id, v_venue_name);

  -- Update member points and visits
  UPDATE coffee_club_members
  SET points = v_new_points,
      visits_count = v_new_visits,
      last_check_in = NOW()
  WHERE id = p_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'points', v_new_points,
    'visits_count', v_new_visits,
    'points_added', p_points_to_add
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', 'You already checked in today!'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unknown',
      'message', SQLERRM
    );
END;
$$;
