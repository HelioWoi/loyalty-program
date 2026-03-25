-- ============================================
-- PASSO 1: CRIAR TABELAS BÁSICAS
-- ============================================
-- Execute este arquivo PRIMEIRO
-- ============================================

-- 1. Criar tabela VENUE_OWNERS
CREATE TABLE IF NOT EXISTS venue_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela VENUES
CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES venue_owners(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
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

-- 3. Adicionar owner_id em loyalty_campaigns (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='loyalty_campaigns' AND column_name='owner_id'
  ) THEN
    ALTER TABLE loyalty_campaigns ADD COLUMN owner_id UUID REFERENCES venue_owners(id);
  END IF;
END $$;

-- 4. Criar indexes básicos
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_subdomain ON venues(subdomain);
CREATE INDEX IF NOT EXISTS idx_venue_owners_auth_user_id ON venue_owners(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_venue_id ON loyalty_campaigns(venue_id);
CREATE INDEX IF NOT EXISTS idx_coffee_club_members_venue ON coffee_club_members(venue);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para verificar:

SELECT 'venue_owners' as table_name, COUNT(*) as exists
FROM information_schema.tables
WHERE table_name = 'venue_owners'
UNION ALL
SELECT 'venues', COUNT(*)
FROM information_schema.tables
WHERE table_name = 'venues';

-- Resultado esperado: 2 linhas com exists = 1
