-- Add DELETE policy for venues table
CREATE POLICY "Owners can delete their own venues"
  ON venues FOR DELETE
  USING (owner_id IN (
    SELECT id FROM venue_owners WHERE auth_user_id = auth.uid()
  ));
