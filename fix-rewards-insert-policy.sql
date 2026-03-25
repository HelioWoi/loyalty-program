-- ============================================
-- FIX: Adicionar policy de INSERT para loyalty_rewards
-- ============================================
-- Esta policy permite que owners criem novos rewards
-- ============================================

-- Verificar policies atuais de loyalty_rewards
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'loyalty_rewards'
ORDER BY policyname;

-- Adicionar policy de INSERT se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'loyalty_rewards' 
      AND policyname = 'Owners can insert rewards'
  ) THEN
    CREATE POLICY "Owners can insert rewards"
      ON loyalty_rewards FOR INSERT
      WITH CHECK (campaign_id IN (
        SELECT lc.id FROM loyalty_campaigns lc
        JOIN venues v ON lc.venue_id = v.id
        JOIN venue_owners vo ON v.owner_id = vo.id
        WHERE vo.auth_user_id = auth.uid()
      ));
  END IF;
END $$;

-- Verificar novamente
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'loyalty_rewards'
ORDER BY policyname;

-- Resultado esperado: deve ter policy "Owners can insert rewards" com cmd = INSERT
