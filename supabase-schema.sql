-- Create the coffee_club_members table
CREATE TABLE IF NOT EXISTS coffee_club_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'MenuLove Powered',
  brand TEXT DEFAULT 'Backstreet Coffee Club',
  venue TEXT DEFAULT 'Backstreet Cafe',
  visits_count INTEGER DEFAULT 0,
  reward_status TEXT DEFAULT 'new' CHECK (reward_status IN ('new', 'active', 'rewarded'))
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_coffee_club_members_email ON coffee_club_members(email);

-- Create an index on brand for filtering
CREATE INDEX IF NOT EXISTS idx_coffee_club_members_brand ON coffee_club_members(brand);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_coffee_club_members_updated_at
  BEFORE UPDATE ON coffee_club_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE coffee_club_members ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts from anyone (for signup)
CREATE POLICY "Allow public inserts" ON coffee_club_members
  FOR INSERT
  WITH CHECK (true);

-- Create a policy to allow reads (you can modify this based on your needs)
CREATE POLICY "Allow public reads" ON coffee_club_members
  FOR SELECT
  USING (true);
