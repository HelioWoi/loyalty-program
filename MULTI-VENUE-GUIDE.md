# 🏪 Multi-Venue System Guide

Este sistema foi projetado para ser **escalável** e suportar múltiplos coffee shops usando a mesma base de código.

## 🎯 Como Funciona

O sistema detecta automaticamente qual coffee shop está sendo acessado baseado no **hostname/domínio** e aplica:
- ✅ Cores personalizadas
- ✅ Nome da marca
- ✅ Descrição personalizada
- ✅ Salvamento correto no banco de dados

## 📋 Como Adicionar um Novo Coffee Shop

### 1. Adicionar Configuração no `lib/venues.ts`

```typescript
export const venues: Record<string, VenueConfig> = {
  // Exemplo existente
  'backstreet-cafe': {
    id: 'backstreet-cafe',
    name: 'Backstreet Cafe',
    brand: 'Backstreet Coffee Club',
    description: 'Join the exclusive circle of coffee lovers at Backstreet Cafe.',
    logo: 'https://your-supabase-url.supabase.co/storage/v1/object/public/media/logo.png', // URL da logo
    colors: {
      primary: '#3D2817',      // Marrom escuro (botões, ícones)
      secondary: '#2C1810',    // Marrom mais escuro (hover)
      accent: '#D4A574',       // Dourado/Bronze (detalhes)
      background: '#EDE8E3',   // Bege claro (fundo)
      text: '#2C1810',         // Texto principal
      textLight: '#6B5D54',    // Texto secundário
      textMuted: '#B5A89C',    // Texto footer
    },
  },
  
  // ADICIONE SEU NOVO COFFEE SHOP AQUI:
  'novo-cafe': {
    id: 'novo-cafe',
    name: 'Novo Cafe',
    brand: 'Novo Cafe Loyalty',
    description: 'Join our exclusive loyalty program and start earning rewards.',
    colors: {
      primary: '#2C5F2D',      // Verde escuro
      secondary: '#1E4620',    // Verde mais escuro
      accent: '#97BC62',       // Verde claro
      background: '#F5F5DC',   // Bege
      text: '#1E4620',
      textLight: '#5A7C5B',
      textMuted: '#A8B5A1',
    },
  },
}
```

### 2. Atualizar Detecção de Hostname

No mesmo arquivo `lib/venues.ts`, atualize a função `getVenueFromHostname`:

```typescript
export function getVenueFromHostname(hostname: string): VenueConfig {
  // Backstreet Cafe
  if (hostname.includes('backstreet')) {
    return venues['backstreet-cafe']
  }
  
  // ADICIONE SEU NOVO CAFE AQUI:
  if (hostname.includes('novocafe') || hostname.includes('novo-cafe')) {
    return venues['novo-cafe']
  }
  
  // Default fallback
  return venues.default
}
```

### 3. Configurar Domínio/Subdomínio

**Opção A: Domínio próprio**
- Configure DNS para apontar para o Netlify
- Exemplo: `novocafe.com.au` → Netlify

**Opção B: Subdomínio**
- Configure subdomínio no Netlify
- Exemplo: `novocafe.loyaltyprogram.com.au`

**Opção C: Teste local**
- Edite `/etc/hosts` (Mac/Linux) ou `C:\Windows\System32\drivers\etc\hosts` (Windows)
- Adicione: `127.0.0.1 novocafe.local`
- Acesse: `http://novocafe.local:3000`

## 🖼️ Adicionando Logo do Coffee Shop

### Upload da Logo no Supabase

1. **Acesse o Supabase Storage:**
   - Vá em https://nuwmbaohgwuanvzotbef.supabase.co
   - Clique em **Storage** no menu lateral
   - Selecione o bucket **media** (ou crie um se não existir)

2. **Faça Upload da Logo:**
   - Clique em **Upload file**
   - Selecione a logo do coffee shop (PNG ou JPG recomendado)
   - Nome sugerido: `logo-nome-do-cafe.png`

3. **Copie a URL Pública:**
   - Clique na imagem enviada
   - Clique em **Get URL** ou **Copy URL**
   - Cole essa URL no campo `logo` da configuração do venue

4. **Adicione na Configuração:**
```typescript
'seu-cafe': {
  id: 'seu-cafe',
  name: 'Seu Cafe',
  brand: 'Seu Cafe Loyalty',
  logo: 'https://nuwmbaohgwuanvzotbef.supabase.co/storage/v1/object/public/media/seu-logo.png',
  // ... resto da config
}
```

**Dicas para Logo:**
- Tamanho recomendado: 200x200px a 400x400px
- Formato: PNG com fundo transparente (ideal) ou JPG
- Logo deve ser quadrada ou circular
- Cores devem contrastar com o background do app

## 🎨 Escolhendo Cores

Use ferramentas como:
- [Coolors.co](https://coolors.co/) - Gerador de paletas
- [Adobe Color](https://color.adobe.com/) - Harmonias de cores
- [Paletton](https://paletton.com/) - Esquemas de cores

**Dicas:**
- `primary`: Cor principal da marca (botões, ícones)
- `secondary`: Versão mais escura para hover
- `accent`: Cor de destaque (detalhes, ícones)
- `background`: Cor de fundo clara
- `text`: Texto principal escuro
- `textLight`: Texto secundário
- `textMuted`: Texto discreto (footer)

## 🔔 Som de Notificação

O sistema toca automaticamente um som de sino quando o usuário completa o cadastro com sucesso. Isso está implementado no componente `SuccessPage`.

## 📊 Dados no Supabase

Cada cadastro salva automaticamente:
- `brand`: Nome da marca do coffee shop
- `venue`: Nome do estabelecimento
- `source`: "MenuLove Powered"

Isso permite filtrar e analisar dados por coffee shop no Supabase.

## 🚀 Deploy Multi-Venue

### Netlify - Múltiplos Sites

**Opção 1: Um deploy por coffee shop**
1. Crie um site no Netlify para cada coffee shop
2. Configure domínio customizado para cada um
3. Mesmo código, domínios diferentes = cores diferentes automaticamente

**Opção 2: Um deploy único com múltiplos domínios**
1. Um único site no Netlify
2. Adicione múltiplos domínios customizados
3. O sistema detecta automaticamente qual coffee shop pelo hostname

## 📝 Exemplo Completo

### Adicionando "Green Bean Cafe"

1. **Adicionar em `lib/venues.ts`:**

```typescript
'green-bean': {
  id: 'green-bean',
  name: 'Green Bean Cafe',
  brand: 'Green Bean Rewards',
  description: 'Join the Green Bean family and earn rewards with every visit.',
  colors: {
    primary: '#2D5016',
    secondary: '#1F3810',
    accent: '#8BC34A',
    background: '#F1F8E9',
    text: '#1F3810',
    textLight: '#558B2F',
    textMuted: '#9E9E9E',
  },
},
```

2. **Atualizar detecção:**

```typescript
if (hostname.includes('greenbean') || hostname.includes('green-bean')) {
  return venues['green-bean']
}
```

3. **Deploy:**
- Configure domínio: `greenbean.com.au`
- Ou subdomínio: `greenbean.loyaltyprogram.com.au`

4. **Pronto!** O site automaticamente usa as cores e textos do Green Bean Cafe.

## 🔍 Testando Localmente

```bash
# Terminal 1: Rodar o servidor
npm run dev

# Terminal 2: Testar diferentes venues
# Edite /etc/hosts e adicione:
# 127.0.0.1 backstreet.local
# 127.0.0.1 greenbean.local

# Acesse:
# http://backstreet.local:3000 (cores marrom/bege)
# http://greenbean.local:3000 (cores verde)
```

## 📈 Escalabilidade

Este sistema suporta:
- ✅ Ilimitados coffee shops
- ✅ Cores personalizadas por venue
- ✅ Textos personalizados
- ✅ Mesmo código base
- ✅ Dados separados por brand no Supabase
- ✅ Som de notificação em todos

## 🎯 Próximos Passos

Para tornar ainda mais escalável:
1. Mover configurações para banco de dados (Supabase)
2. Criar painel admin para adicionar novos venues
3. Upload de logos personalizados
4. Temas de cores pré-definidos
5. Customização de sons de notificação
