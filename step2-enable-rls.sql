-- ============================================
-- PASSO 2: HABILITAR RLS (ROW LEVEL SECURITY)
-- ============================================
-- Execute este arquivo DEPOIS do step1-create-tables.sql
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE venue_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('venue_owners', 'venues', 'loyalty_campaigns', 'loyalty_rewards', 'coffee_club_members', 'check_ins', 'redemptions')
ORDER BY tablename;

-- Resultado esperado: rowsecurity = true para todas as 7 tabelas
