-- ============================================
-- VERIFICAÇÃO DO SETUP MULTI-TENANT
-- ============================================
-- Execute estas queries no Supabase SQL Editor para verificar
-- se tudo foi criado corretamente
-- ============================================

-- 1. VERIFICAR TABELAS CRIADAS
-- ============================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('venue_owners', 'venues', 'loyalty_campaigns', 'loyalty_rewards', 'coffee_club_members', 'check_ins', 'redemptions')
ORDER BY table_name;

-- Resultado esperado: 7 tabelas (venue_owners, venues, e as 5 existentes)

-- 2. VERIFICAR COLUNAS DA TABELA VENUE_OWNERS
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'venue_owners'
ORDER BY ordinal_position;

-- Resultado esperado: id, auth_user_id, full_name, email, phone, created_at, updated_at

-- 3. VERIFICAR COLUNAS DA TABELA VENUES
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'venues'
ORDER BY ordinal_position;

-- Resultado esperado: id, owner_id, venue_name, subdomain, logo_url, brand_colors, address, city, state, country, active, created_at, updated_at

-- 4. VERIFICAR SE OWNER_ID FOI ADICIONADO EM LOYALTY_CAMPAIGNS
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'loyalty_campaigns'
  AND column_name = 'owner_id';

-- Resultado esperado: 1 linha com owner_id

-- 5. VERIFICAR RLS (ROW LEVEL SECURITY) HABILITADO
-- ============================================
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('venue_owners', 'venues', 'loyalty_campaigns', 'loyalty_rewards', 'coffee_club_members', 'check_ins', 'redemptions');

-- Resultado esperado: rowsecurity = true para todas as tabelas

-- 6. VERIFICAR POLICIES CRIADAS
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Resultado esperado: Múltiplas policies para cada tabela

-- 7. VERIFICAR INDEXES CRIADOS
-- ============================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Resultado esperado: idx_venues_owner_id, idx_venues_subdomain, idx_venue_owners_auth_user_id, etc.

-- 8. VERIFICAR FUNCTIONS CRIADAS
-- ============================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_owner_venues', 'create_venue_for_owner');

-- Resultado esperado: 2 functions

-- 9. VERIFICAR SEED DATA (SE EXECUTOU)
-- ============================================
SELECT * FROM venue_owners;
SELECT * FROM venues;
SELECT * FROM loyalty_campaigns WHERE venue_id IN (SELECT id FROM venues);

-- Se executou o seed data, deve mostrar o owner demo e venue backstreet-cafe

-- 10. TESTE DE FOREIGN KEYS
-- ============================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('venue_owners', 'venues', 'loyalty_campaigns')
ORDER BY tc.table_name;

-- Resultado esperado: 
-- venue_owners.auth_user_id -> auth.users.id
-- venues.owner_id -> venue_owners.id
-- loyalty_campaigns.venue_id -> venues.id

-- ============================================
-- RESUMO RÁPIDO
-- ============================================
-- Execute esta query para ver um resumo:

SELECT 
  'Tabelas criadas' as check_item,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('venue_owners', 'venues')

UNION ALL

SELECT 
  'RLS habilitado',
  COUNT(*)
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename IN ('venue_owners', 'venues', 'loyalty_campaigns')

UNION ALL

SELECT 
  'Policies criadas',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Indexes criados',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'

UNION ALL

SELECT 
  'Functions criadas',
  COUNT(*)
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_owner_venues', 'create_venue_for_owner');

-- ============================================
-- RESULTADO ESPERADO DO RESUMO:
-- ============================================
-- Tabelas criadas: 2
-- RLS habilitado: 3+
-- Policies criadas: 10+
-- Indexes criados: 5+
-- Functions criadas: 2
-- ============================================
