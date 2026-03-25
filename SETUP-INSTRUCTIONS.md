# 🚀 Setup Instructions - Multi-Tenant Loyalty Program

## 📋 O Que Você Precisa Fazer no Supabase

### 1️⃣ Executar o Schema SQL

Acesse o Supabase SQL Editor e execute o arquivo `multi-tenant-schema.sql` na seguinte ordem:

```sql
-- PASSO 1: Criar tabelas de owners e venues
-- Execute as seções do multi-tenant-schema.sql:
-- - Seção 1: VENUE OWNERS TABLE
-- - Seção 2: VENUES TABLE
-- - Seção 3: UPDATE EXISTING TABLES
```

**IMPORTANTE:** Execute seção por seção, não tudo de uma vez. Verifique se cada seção executou sem erros antes de continuar.

### 2️⃣ Habilitar Supabase Auth

No Supabase Dashboard:

1. Vá em **Authentication** → **Providers**
2. Habilite **Email** provider
3. **Desabilite** "Confirm email" (para facilitar testes)
   - Depois você pode habilitar para produção
4. Salve as configurações

### 3️⃣ Executar RLS Policies

Execute a seção 4 do `multi-tenant-schema.sql`:

```sql
-- PASSO 2: Habilitar RLS e criar policies
-- Execute a seção 4: ROW LEVEL SECURITY (RLS) POLICIES
```

Isso vai:
- Habilitar RLS em todas as tabelas
- Criar policies para isolar dados por owner
- Permitir acesso público apenas para dados necessários (signup, campaigns)

### 4️⃣ Criar Indexes (Performance)

Execute a seção 5:

```sql
-- PASSO 3: Criar indexes para performance
-- Execute a seção 5: INDEXES FOR PERFORMANCE
```

### 5️⃣ Criar Functions Helper

Execute a seção 6:

```sql
-- PASSO 4: Criar functions helper
-- Execute a seção 6: FUNCTIONS
```

### 6️⃣ (Opcional) Seed Data

Se quiser testar com dados de exemplo:

```sql
-- PASSO 5: Seed data de exemplo
-- Execute a seção 7: SEED DATA
```

Isso cria um owner demo e venue de exemplo.

---

## 🧪 Como Testar

### 1. Criar Conta de Owner

1. Acesse: `http://localhost:3000/owner-signup`
2. Preencha o formulário:
   - **Full Name**: Seu nome
   - **Business Name**: Nome do café (ex: "Mooloo Brew")
   - **Email**: seu@email.com
   - **Phone**: (opcional)
   
**💰 Pricing:** $29.90/month per location + **14 DAYS FREE TRIAL**
   - **Password**: mínimo 6 caracteres
3. Clique em "Create Account"

### 2. Verificar no Supabase

Após criar a conta, verifique no Supabase:

```sql
-- Ver owners criados
SELECT * FROM venue_owners;

-- Ver venues criados
SELECT * FROM venues;

-- Ver campaigns criados
SELECT * FROM loyalty_campaigns;
```

### 3. Fazer Login

1. Acesse: `http://localhost:3000/owner-login`
2. Use o email e senha que você criou
3. Deve redirecionar para `/admin`

### 4. Testar Dashboard

No dashboard você deve ver:
- ✅ Nome do seu venue no header
- ✅ Logo (se fez upload)
- ✅ Botão "Logout"
- ✅ Apenas dados do SEU venue (não de outros)

### 5. Testar Multi-Location (Opcional)

Para testar múltiplos venues:

```sql
-- Criar segundo venue para o mesmo owner
-- Substitua 'SEU_OWNER_ID' pelo ID do owner criado
INSERT INTO venues (id, owner_id, venue_name, subdomain, active)
VALUES (
  'mooloo-brew-2',
  'SEU_OWNER_ID',
  'Mooloo Brew - Location 2',
  'mooloo2',
  true
);

-- Criar campaign para o novo venue
INSERT INTO loyalty_campaigns (
  campaign_name,
  points_per_checkin,
  venue_id,
  owner_id,
  active
) VALUES (
  'Mooloo Brew - Location 2 POINTS CLUB',
  5,
  'mooloo-brew-2',
  'SEU_OWNER_ID',
  true
);
```

Depois, faça login novamente e você verá um **seletor de venues** no header do dashboard.

---

## 🔧 Troubleshooting

### Erro: "Owner account not found"
- Verifique se a tabela `venue_owners` foi criada
- Verifique se o RLS está configurado corretamente

### Erro: "Failed to create account"
- Verifique se o Supabase Auth está habilitado
- Verifique se o email já não existe

### Dashboard não carrega dados
- Verifique se o `currentVenue` está definido
- Verifique se as RLS policies permitem acesso aos dados
- Verifique no console do navegador se há erros

### Logo não aparece
- Verifique se `logo_url` está definido na tabela `venues`
- Faça upload de logo no dashboard (Campaign Settings → Branding)

---

## 📊 Estrutura do Sistema

```
Owner (venue_owners)
  └── Venue 1 (venues)
      ├── Campaign (loyalty_campaigns)
      ├── Rewards (loyalty_rewards)
      ├── Members (coffee_club_members)
      ├── Check-ins (check_ins)
      └── Redemptions (redemptions)
  └── Venue 2 (venues)
      ├── Campaign
      ├── Rewards
      ├── Members
      ├── Check-ins
      └── Redemptions
```

Cada owner pode ter múltiplos venues, e cada venue tem seus próprios dados isolados.

---

## 🎯 Próximos Passos Após Setup

1. ✅ Testar signup/login
2. ✅ Testar dashboard com dados isolados
3. ✅ Fazer upload de logo
4. ✅ Configurar campaign name
5. ✅ Criar rewards
6. ✅ Testar experiência do cliente (QR code, check-in)
7. 🚀 Fazer commit e push das mudanças

---

## 💡 Dicas

- **Desenvolvimento**: Use `demo@menulove.com` / senha que você definir para testes
- **Produção**: Habilite "Confirm email" no Supabase Auth
- **Segurança**: As RLS policies garantem que cada owner vê apenas seus dados
- **Performance**: Os indexes foram criados para queries rápidas

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs do Supabase
3. Execute as queries de verificação no final do `multi-tenant-schema.sql`
