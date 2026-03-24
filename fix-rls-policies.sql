-- Fix RLS Policies for coffee_club_members
-- Execute este SQL no Supabase para corrigir permissões

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Allow public inserts" ON coffee_club_members;
DROP POLICY IF EXISTS "Allow public reads" ON coffee_club_members;

-- 2. Recreate policies with correct permissions
CREATE POLICY "Enable insert for all users" ON coffee_club_members
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON coffee_club_members
  FOR SELECT
  USING (true);

CREATE POLICY "Enable update for all users" ON coffee_club_members
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. Verify RLS is enabled
ALTER TABLE coffee_club_members ENABLE ROW LEVEL SECURITY;

-- 4. Grant permissions to anon role (public access)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON coffee_club_members TO anon;
GRANT ALL ON check_ins TO anon;

-- 5. Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'coffee_club_members';
