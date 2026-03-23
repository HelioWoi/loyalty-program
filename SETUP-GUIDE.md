# 🚀 Setup Guide - Loyalty Program

## ✅ O que já está pronto

- ✅ Projeto Next.js criado com TypeScript e TailwindCSS
- ✅ Componentes implementados (Landing, Signup, Success)
- ✅ Integração com Supabase configurada
- ✅ Variáveis de ambiente configuradas (`.env.local`)
- ✅ Código enviado para GitHub: https://github.com/HelioWoi/loyalty-program
- ✅ Arquivos de configuração Netlify criados

## 📋 Próximos Passos

### 1️⃣ Criar Tabela no Supabase (IMPORTANTE!)

1. Acesse seu projeto Supabase: https://nuwmbaohgwuanvzotbef.supabase.co
2. Vá em **SQL Editor** no menu lateral
3. Clique em **New Query**
4. Copie TODO o conteúdo do arquivo `supabase-schema.sql` (na raiz do projeto)
5. Cole no editor SQL
6. Clique em **Run** para executar
7. Verifique se a tabela `coffee_club_members` foi criada em **Table Editor**

**O que o SQL faz:**
- Cria a tabela `coffee_club_members` com todos os campos necessários
- Adiciona índices para performance
- Configura Row Level Security (RLS) para segurança
- Permite inserções públicas (para signup) e leituras públicas

### 2️⃣ Testar Localmente

```bash
cd /Users/heliowoi/Documents/loyalty-program
npm run dev
```

Abra http://localhost:3000 e teste:
1. Clique em "Join Now"
2. Preencha nome e email
3. Clique em "Join the Club"
4. Verifique se aparece a tela de sucesso
5. Vá no Supabase > Table Editor > coffee_club_members e veja se o registro foi criado

### 3️⃣ Deploy no Netlify

#### Opção A: Via GitHub (Recomendado)

1. Acesse https://app.netlify.com
2. Clique em **Add new site** > **Import an existing project**
3. Escolha **GitHub**
4. Selecione o repositório `loyalty-program`
5. Configure:
   - **Build command**: `npm run build` (já está no netlify.toml)
   - **Publish directory**: `.next` (já está no netlify.toml)
6. Clique em **Add environment variable**:
   - Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51d21iYW9oZ3d1YW52em90YmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDE3MjgsImV4cCI6MjA4OTgxNzcyOH0.nnOkXC5QF6scUZuAiTISA45Wnuxr5PvEPJZgPcvj-c0`
7. Clique em **Deploy**

#### Opção B: Via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### 4️⃣ Configurar Domínio Customizado

Depois que o site estiver no ar no Netlify:

1. No dashboard do Netlify, vá em **Domain settings**
2. Clique em **Add custom domain**
3. Digite: `loyaltyprogram.com.au`
4. Siga as instruções para configurar DNS:
   - Adicione um registro CNAME apontando para o domínio do Netlify
   - Ou configure os nameservers do Netlify

**Registros DNS necessários:**
```
Type: CNAME
Name: www
Value: [seu-site].netlify.app

Type: A
Name: @
Value: 75.2.60.5 (IP do Netlify)
```

### 5️⃣ Habilitar HTTPS

O Netlify automaticamente provisiona certificado SSL gratuito via Let's Encrypt.
Aguarde alguns minutos após configurar o domínio.

## 🎨 Personalização

### Mudar Nome da Marca

Edite os arquivos:
- `components/LandingPage.tsx` - linha com "Backstreet Coffee Club"
- `components/SignupForm.tsx` - linha com "Join the Club"
- `components/SuccessPage.tsx` - linha com "Welcome to Backstreet Coffee Club"
- `app/page.tsx` - linhas 27-29 (brand, venue, source)

### Mudar Cores

O projeto usa paleta amber/orange. Para mudar:
- Procure por `amber-` e `orange-` nos arquivos de componentes
- Substitua por outra cor do Tailwind (ex: `blue-`, `green-`, `purple-`)

Cores disponíveis: slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose

## 🔍 Verificação

### Checklist Final

- [ ] Tabela criada no Supabase
- [ ] App funciona localmente (npm run dev)
- [ ] Consegue fazer signup e ver dados no Supabase
- [ ] Deploy no Netlify concluído
- [ ] Site acessível via URL do Netlify
- [ ] Domínio customizado configurado (opcional)
- [ ] HTTPS habilitado

## 🆘 Troubleshooting

### Erro: "Failed to insert member"
- Verifique se a tabela foi criada no Supabase
- Confirme que as políticas RLS estão ativas
- Verifique as credenciais no `.env.local`

### Erro: Build failed no Netlify
- Certifique-se que a variável `NEXT_PUBLIC_SUPABASE_ANON_KEY` foi adicionada
- Verifique os logs de build no Netlify

### Email duplicado
- O banco tem constraint UNIQUE no email
- Isso é intencional para evitar cadastros duplicados

## 📞 Suporte

- **Supabase Dashboard**: https://nuwmbaohgwuanvzotbef.supabase.co
- **GitHub Repo**: https://github.com/HelioWoi/loyalty-program
- **Netlify Dashboard**: https://app.netlify.com

## 🎯 Próximas Features (Futuro)

- Dashboard do membro
- Sistema de pontos/carimbos
- Notificações por email
- QR Code para check-in
- Painel administrativo
- Analytics e relatórios
