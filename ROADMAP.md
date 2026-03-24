# 🎯 Loyalty Program - Product Roadmap

## 📱 Visão do Produto

Sistema de fidelidade completo e escalável para cafeterias, com CRM integrado, check-in automático via QR Code, e gestão de recompensas.

---

## ✅ FASE 1 - MVP Atual (CONCLUÍDO)

### Funcionalidades Implementadas:
- ✅ Landing Page com QR Code dinâmico
- ✅ Formulário de cadastro (signup)
- ✅ Tela de sucesso com som e ícone
- ✅ Sistema multi-venue (escalável para vários cafés)
- ✅ Integração com Supabase
- ✅ Design elegante bege/marrom
- ✅ Navegação completa (back buttons)
- ✅ Footer "Powered by MenuLove™"

### Banco de Dados:
- Tabela: `coffee_club_members`
- Campos: id, full_name, email, created_at, updated_at, source, brand, venue, visits_count, reward_status

---

## 🎯 FASE 2 - Sistema de Check-in e Rewards (PRÓXIMO)

### 2.1 Detecção Inteligente de Usuário
**Objetivo:** QR Code para membros existentes, botão "Join" para novos

**Implementação:**
```typescript
// Fluxo:
1. Landing Page detecta se há email no localStorage
2. Se SIM → Mostra QR Code + "Tap to Check-in"
3. Se NÃO → Mostra QR Code + "Join Us" button

// Armazenamento local:
localStorage.setItem('loyalty_member_email', email)
localStorage.setItem('loyalty_member_id', id)
```

**Telas Necessárias:**
- `CheckInPage.tsx` - Para membros existentes
- `RewardsPage.tsx` - Mostrar progresso de visitas

### 2.2 Sistema de Check-in
**Fluxo do Membro Existente:**
```
1. Abre app → Detecta membro
2. Mostra: "Welcome back, [Nome]!"
3. Botão grande: "Check-in Now" ou QR Code
4. Ao check-in:
   - visits_count++
   - Mostra progresso: "3/10 visits"
   - Som de recompensa
   - Se atingiu meta → reward_status = 'rewarded'
```

**Banco de Dados:**
```sql
-- Nova tabela para histórico
CREATE TABLE check_ins (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES coffee_club_members(id),
  venue TEXT,
  checked_in_at TIMESTAMP DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT false
);

-- Trigger automático para incrementar visits_count
CREATE FUNCTION increment_visits()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coffee_club_members 
  SET visits_count = visits_count + 1,
      reward_status = CASE 
        WHEN visits_count + 1 >= 10 THEN 'rewarded'
        WHEN visits_count + 1 >= 1 THEN 'active'
        ELSE 'new'
      END
  WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Tela de Rewards/Progresso
**UI:**
```
┌─────────────────────────┐
│   [Logo Backstreet]     │
│                         │
│   Welcome, João!        │
│                         │
│   ●●●●●●●○○○           │
│   6 out of 10 visits    │
│                         │
│   Next reward:          │
│   Free Coffee! ☕       │
│                         │
│   [Check-in Now]        │
│                         │
│   Last visit: 2 days ago│
└─────────────────────────┘
```

---

## 🎯 FASE 3 - Dashboard Admin (CRM Simples)

### 3.1 Painel do Café
**URL:** `/admin` (protegido por senha simples)

**Funcionalidades:**
1. **Visão Geral:**
   - Total de membros
   - Check-ins hoje/semana/mês
   - Recompensas pendentes
   - Taxa de retorno

2. **Lista de Membros:**
   - Busca por nome/email
   - Filtros: novos, ativos, com recompensa
   - Exportar CSV

3. **Analytics Simples:**
   - Gráfico de novos membros por dia
   - Horários de pico de check-in
   - Membros mais frequentes

**Banco de Dados:**
```sql
-- Tabela de admin (simples)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  venue TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Telas Admin
- `admin/dashboard` - Overview
- `admin/members` - Lista de membros
- `admin/analytics` - Gráficos simples
- `admin/settings` - Configurações do venue

---

## 🎯 FASE 4 - Automação e Notificações

### 4.1 Email Automático (Resend ou SendGrid)
**Triggers:**
1. **Boas-vindas:** Ao se cadastrar
2. **Lembrete:** Após 7 dias sem visita
3. **Recompensa:** Quando atingir 10 visitas
4. **Aniversário:** Recompensa especial

**Implementação:**
```typescript
// Edge Function no Supabase
export async function sendWelcomeEmail(member) {
  await resend.emails.send({
    from: 'Backstreet Cafe <rewards@backstreetcafe.com.au>',
    to: member.email,
    subject: 'Welcome to Backstreet Coffee Club! ☕',
    html: welcomeTemplate(member.full_name)
  })
}
```

### 4.2 Push Notifications (Opcional)
- Usar OneSignal ou Firebase
- Notificar quando próximo do café
- Lembrar de resgatar recompensa

---

## 🎯 FASE 5 - Features Avançadas

### 5.1 Gamificação
- Badges/Conquistas
- Níveis (Bronze, Silver, Gold)
- Desafios semanais

### 5.2 Referral Program
- "Indique um amigo, ganhe 1 visita grátis"
- Link único por membro
- Tracking de referrals

### 5.3 Integração com POS
- API para sistemas de PDV
- Check-in automático ao pagar
- Sincronização de compras

---

## 📊 Arquitetura de Dados - CRM Simples

### Estrutura Organizada:

```
┌─────────────────────────────────────┐
│         SUPABASE DATABASE           │
├─────────────────────────────────────┤
│                                     │
│  📋 coffee_club_members             │
│  ├─ Dados do cliente                │
│  ├─ Status de recompensa            │
│  └─ Contagem de visitas             │
│                                     │
│  📍 check_ins                       │
│  ├─ Histórico de visitas            │
│  ├─ Data/hora                       │
│  └─ Venue                           │
│                                     │
│  🎁 rewards                         │
│  ├─ Recompensas disponíveis         │
│  ├─ Recompensas resgatadas          │
│  └─ Data de expiração               │
│                                     │
│  👤 admin_users                     │
│  ├─ Usuários admin                  │
│  └─ Permissões por venue            │
│                                     │
│  📧 email_logs                      │
│  ├─ Histórico de emails             │
│  └─ Status de entrega               │
│                                     │
└─────────────────────────────────────┘
```

### Queries Úteis para CRM:

```sql
-- Membros mais ativos
SELECT full_name, email, visits_count 
FROM coffee_club_members 
ORDER BY visits_count DESC 
LIMIT 10;

-- Novos membros esta semana
SELECT COUNT(*) 
FROM coffee_club_members 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Membros inativos (sem check-in há 30 dias)
SELECT m.* 
FROM coffee_club_members m
LEFT JOIN check_ins c ON m.id = c.member_id
WHERE c.checked_in_at < NOW() - INTERVAL '30 days'
OR c.id IS NULL;

-- Recompensas pendentes
SELECT full_name, email, visits_count
FROM coffee_club_members
WHERE reward_status = 'rewarded';
```

---

## 🚀 Implementação Recomendada

### Ordem de Prioridade:

**AGORA (Esta Semana):**
1. ✅ Commit do MVP atual
2. 🔄 Sistema de detecção de usuário (localStorage)
3. 🔄 Tela de Check-in
4. 🔄 Incremento automático de visitas

**PRÓXIMA SEMANA:**
5. Dashboard Admin básico
6. Lista de membros
7. Exportar CSV

**MÊS 1:**
8. Email de boas-vindas
9. Analytics simples
10. Tela de progresso/rewards

**MÊS 2:**
11. Email automático (lembretes)
12. Sistema de recompensas
13. Gamificação básica

---

## 💡 Decisões Arquiteturais

### Por que esta abordagem é simples e eficiente:

1. **Sem duplicação:**
   - Um único banco Supabase
   - Tabelas relacionadas (foreign keys)
   - RLS para segurança

2. **Escalável:**
   - Multi-venue desde o início
   - Fácil adicionar novos cafés
   - Código reutilizável

3. **Baixo custo:**
   - Supabase free tier (50k rows)
   - Netlify free tier
   - Resend free tier (100 emails/dia)

4. **Manutenível:**
   - TypeScript para type safety
   - Componentes reutilizáveis
   - Documentação clara

5. **CRM Integrado:**
   - Dados centralizados
   - Queries SQL diretas
   - Export fácil para análise

---

## 📱 Fluxos Completos

### Fluxo do Novo Membro:
```
Landing → Join Us → Signup Form → Success → 
Email Boas-vindas → Salva no localStorage → 
Próxima visita: Check-in direto
```

### Fluxo do Membro Existente:
```
Landing (detecta membro) → Welcome Back → 
Check-in → Incrementa visita → Mostra progresso → 
Se 10 visitas: Recompensa! → Email notificação
```

### Fluxo do Admin:
```
/admin/login → Dashboard → 
Ver membros/analytics → Exportar dados → 
Enviar email manual (opcional)
```

---

## 🎯 Métricas de Sucesso

**KPIs para acompanhar:**
- Taxa de conversão (visitantes → membros)
- Frequência de check-in
- Taxa de resgate de recompensas
- Tempo médio entre visitas
- Membros ativos vs inativos
- ROI do programa

---

## 🔐 Segurança e Privacidade

1. **LGPD/GDPR Compliance:**
   - Consentimento explícito no signup
   - Opção de deletar conta
   - Export de dados pessoais

2. **Segurança:**
   - RLS no Supabase
   - Admin protegido por senha
   - Rate limiting em APIs
   - Validação de emails

---

## 📝 Próximos Passos Imediatos

**Vamos fazer agora:**
1. Commit do MVP atual
2. Criar sistema de detecção de usuário
3. Implementar tela de Check-in
4. Adicionar tabela de check_ins

**Quer que eu comece a implementar a Fase 2?**
