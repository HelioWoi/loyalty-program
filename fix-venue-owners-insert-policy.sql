-- ============================================
-- FIX: Adicionar policy de INSERT para venue_owners
-- ============================================
-- Esta policy permite que novos owners se cadastrem
-- ============================================

-- Permitir INSERT público em venue_owners (para signup)
CREATE POLICY "Allow public signup"
  ON venue_owners FOR INSERT
  WITH CHECK (true);

-- Verificar policies de venue_owners
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'venue_owners'
ORDER BY policyname;

-- Resultado esperado: 3 policies (SELECT, UPDATE, INSERT)
