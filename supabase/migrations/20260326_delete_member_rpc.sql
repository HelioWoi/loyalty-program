-- RPC function to delete a member and all related data
-- This runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION delete_member_cascade(p_member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete check-ins
  DELETE FROM check_ins WHERE member_id = p_member_id;
  
  -- Delete redemptions
  DELETE FROM redemptions WHERE member_id = p_member_id;
  
  -- Delete the member
  DELETE FROM coffee_club_members WHERE id = p_member_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'delete_member_cascade error: %', SQLERRM;
    RETURN FALSE;
END;
$$;
