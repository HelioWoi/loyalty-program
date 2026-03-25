-- ============================================
-- CLEANUP: Remover usuário de teste
-- ============================================
-- Use este SQL para limpar o email de teste e tentar novamente
-- ============================================

-- 1. Ver o auth_user_id do email
SELECT id, email FROM auth.users WHERE email = 'heliowoi@gmail.com';

-- 2. Deletar da tabela venue_owners (se existir)
DELETE FROM venue_owners WHERE email = 'heliowoi@gmail.com';

-- 3. Deletar do Supabase Auth
-- IMPORTANTE: Substitua 'USER_ID_AQUI' pelo ID que apareceu na query acima
-- DELETE FROM auth.users WHERE email = 'heliowoi@gmail.com';

-- ============================================
-- ALTERNATIVA: Use um email diferente
-- ============================================
-- Ou simplesmente use outro email para testar:
-- - heliowoi+test@gmail.com
-- - heliowoi+test2@gmail.com
-- - outro@email.com
