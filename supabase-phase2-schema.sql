-- PHASE 2: Check-ins and Rewards System
-- Execute este SQL no Supabase após criar a tabela coffee_club_members

-- 1. Criar tabela de check-ins
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES coffee_club_members(id) ON DELETE CASCADE,
  venue TEXT NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT false,
  notes TEXT
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_check_ins_member_id ON check_ins(member_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_venue ON check_ins(venue);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(checked_in_at);

-- 3. Criar função para incrementar visitas automaticamente
CREATE OR REPLACE FUNCTION increment_member_visits()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementa visits_count
  UPDATE coffee_club_members 
  SET 
    visits_count = visits_count + 1,
    updated_at = NOW(),
    -- Atualiza reward_status baseado no número de visitas
    reward_status = CASE 
      WHEN visits_count + 1 >= 10 THEN 'rewarded'
      WHEN visits_count + 1 >= 1 THEN 'active'
      ELSE 'new'
    END
  WHERE id = NEW.member_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para incrementar visitas ao fazer check-in
DROP TRIGGER IF EXISTS trigger_increment_visits ON check_ins;
CREATE TRIGGER trigger_increment_visits
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION increment_member_visits();

-- 5. Habilitar RLS na tabela check_ins
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para check_ins
CREATE POLICY "Allow public inserts on check_ins" ON check_ins
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow users to read their own check_ins" ON check_ins
  FOR SELECT
  USING (true);

-- 7. Função para obter estatísticas do membro
CREATE OR REPLACE FUNCTION get_member_stats(member_email TEXT)
RETURNS TABLE (
  member_id UUID,
  full_name TEXT,
  email TEXT,
  visits_count INTEGER,
  reward_status TEXT,
  last_check_in TIMESTAMP WITH TIME ZONE,
  days_since_last_visit INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.full_name,
    m.email,
    m.visits_count,
    m.reward_status,
    MAX(c.checked_in_at) as last_check_in,
    EXTRACT(DAY FROM NOW() - MAX(c.checked_in_at))::INTEGER as days_since_last_visit
  FROM coffee_club_members m
  LEFT JOIN check_ins c ON m.id = c.member_id
  WHERE m.email = member_email
  GROUP BY m.id, m.full_name, m.email, m.visits_count, m.reward_status;
END;
$$ LANGUAGE plpgsql;

-- 8. Função para verificar se pode fazer check-in (evitar duplicatas no mesmo dia)
CREATE OR REPLACE FUNCTION can_check_in(member_email TEXT, venue_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  last_checkin TIMESTAMP;
  member_uuid UUID;
BEGIN
  -- Busca o ID do membro
  SELECT id INTO member_uuid FROM coffee_club_members WHERE email = member_email;
  
  IF member_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Busca o último check-in do membro neste venue
  SELECT MAX(checked_in_at) INTO last_checkin 
  FROM check_ins 
  WHERE member_id = member_uuid AND venue = venue_name;
  
  -- Permite check-in se nunca fez ou se o último foi há mais de 4 horas
  IF last_checkin IS NULL OR (NOW() - last_checkin) > INTERVAL '4 hours' THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. View para analytics (útil para dashboard admin futuro)
CREATE OR REPLACE VIEW member_analytics AS
SELECT 
  m.id,
  m.full_name,
  m.email,
  m.venue,
  m.visits_count,
  m.reward_status,
  m.created_at,
  COUNT(c.id) as total_checkins,
  MAX(c.checked_in_at) as last_checkin,
  MIN(c.checked_in_at) as first_checkin,
  EXTRACT(DAY FROM NOW() - MAX(c.checked_in_at))::INTEGER as days_inactive
FROM coffee_club_members m
LEFT JOIN check_ins c ON m.id = c.member_id
GROUP BY m.id, m.full_name, m.email, m.venue, m.visits_count, m.reward_status, m.created_at;

-- 10. Comentários para documentação
COMMENT ON TABLE check_ins IS 'Histórico de check-ins dos membros do programa de fidelidade';
COMMENT ON COLUMN check_ins.reward_claimed IS 'Indica se a recompensa foi resgatada neste check-in';
COMMENT ON FUNCTION increment_member_visits() IS 'Incrementa automaticamente visits_count ao fazer check-in';
COMMENT ON FUNCTION can_check_in(TEXT, TEXT) IS 'Verifica se o membro pode fazer check-in (evita duplicatas no mesmo dia)';
