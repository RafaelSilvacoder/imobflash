# ImobQuick 🏠✨

Micro-SaaS mobile-first para corretores de imóveis: cadastro rápido de imóveis,
compressão e upload de fotos, geração de textos de divulgação com IA
(Instagram, Portais e WhatsApp), assinatura mensal e programa de indicação
"Indique e Ganhe".

## Stack

- React + Vite
- Tailwind CSS
- Supabase (Auth, Database, Storage, RLS)
- OpenAI API (geração de textos)

## 1. Instalação

```bash
npm install
cp .env.example .env
```

Preencha o `.env`:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — em Project Settings > API no Supabase.
- `VITE_APP_URL` — domínio público do app (usado no link de indicação).
- `VITE_CHECKOUT_URL` — URL do checkout de assinatura (Asaas/Mercado Pago).

A chave da OpenAI **não vai no `.env` do frontend** — veja a seção 8 para
configurá-la como secret da Edge Function.

## 2. Banco de dados

No **SQL Editor** do Supabase, rode o conteúdo de `sql/schema.sql`. Ele cria:

- `profiles` — assinatura, role (`user`/`admin`), código e progresso de indicação;
- trigger `handle_new_user` — cria o perfil automaticamente no cadastro, com
  7 dias de trial e vinculando `referred_by` (lido do metadata enviado no signup);
- função `process_paid_referral` — soma +30 dias a cada 2 indicados pagos
  (deve ser chamada pelo seu **backend/webhook de pagamento**, não pelo frontend);
- função `grant_free_days` — usada pelo botão "Conceder 7 Dias Grátis" no Admin;
- `properties` — dados dos imóveis;
- políticas de **RLS** para `profiles` e `properties`;
- bucket `property-photos` no Storage, com políticas de upload/leitura/exclusão.

Depois de criar sua conta pelo app, torne-a admin rodando:

```sql
update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
```

## 3. Autenticação e controle de acesso

- `src/components/AuthScreen.jsx` — login e cadastro por e-mail/senha. No
  cadastro, captura o parâmetro `?ref=CODIGO` da URL (`getReferralCodeFromUrl`
  em `authService.js`) e envia como metadata do usuário, lido pela trigger no
  banco para preencher `referred_by`.
- `App.jsx` verifica a sessão e o perfil (`profiles`) a cada carregamento. O
  acesso ao app só é liberado se `subscription_status === 'active'` **e**
  `subscription_ends_at` estiver no futuro (`hasActiveSubscription` em
  `profileService.js`). Usuários com `role === 'admin'` sempre têm acesso.
- Se a assinatura estiver expirada/inativa, `SubscriptionGate.jsx` é exibido
  com os benefícios do app e botão para assinar (`VITE_CHECKOUT_URL`).

## 4. Painel Admin

Visível apenas para perfis com `role === 'admin'` (botão "⚙️ Painel Admin" na
aba Perfil). `src/components/AdminPanel.jsx` tem duas abas internas:

- **Perfis** — lista todos os perfis, com busca por e-mail, "🎁 Conceder 7
  Dias Grátis" (chama `grant_free_days` no banco) e "Ativação Manual"
  (assinatura "ilimitada" de 10 anos, para demonstrações).
- **Dispositivos** — aprova ou rejeita solicitações de acesso de um 3º
  dispositivo (ver seção 5 abaixo).

## 5. Controle de dispositivos (antipirataria)

Evita que uma única assinatura seja compartilhada entre vários corretores
(ex: uma imobiliária com 10 corretores usando o mesmo login).

**Como funciona:**

1. No primeiro acesso, o app gera um ID único do dispositivo (UUID salvo em
   `localStorage`, `src/services/deviceService.js`) e o registra no banco via
   a função `register_or_check_device` (RPC).
2. Os **2 primeiros dispositivos** de cada conta são aprovados
   automaticamente.
3. A partir do **3º dispositivo**, o acesso fica bloqueado **só naquele
   aparelho** — a conta continua funcionando normalmente nos 2 já aprovados.
   A pessoa vê a tela `DeviceBlockedScreen.jsx` explicando o motivo.
4. O admin vê a solicitação na aba **Dispositivos** do Painel Admin
   (`DeviceApprovalList.jsx`) e pode **aprovar** (o que revoga automaticamente
   o dispositivo aprovado mais antigo, mantendo o limite de 2) ou **rejeitar**.

⚠️ Isso é um identificador de navegador (não uma trava criptográfica
inquebrável) — é suficiente para impedir o compartilhamento casual de uma
conta entre muitas pessoas, mas alguém tecnicamente insistente pode limpar o
`localStorage` para gerar um novo ID. Para elevar o nível de proteção no
futuro, dá pra combinar com outros sinais (IP, geolocalização aproximada,
horário de uso) na própria função `register_or_check_device`.

Admins (`role === 'admin'`) ficam isentos dessa checagem, para nunca
correrem o risco de ficar trancados fora do próprio painel.

## 6. Indique e Ganhe

`src/components/ReferralSection.jsx` exibe:

- o link único de indicação (`VITE_APP_URL/register?ref=CODIGO`), com botão
  "Copiar Meu Link de Convite";
- barra de progresso do par atual (ex: 1/2) até o próximo bônus de +30 dias;
- total de indicados pagantes e de meses grátis acumulados.

⚠️ A contagem de indicados **pagos** e a concessão dos +30 dias são feitas
pela função `process_paid_referral(referrer_code)` no banco, que deve ser
chamada pelo seu backend/webhook de pagamento quando a cobrança de um
indicado for confirmada — isso está fora do escopo do frontend.

## 7. Dados do corretor salvos automaticamente

Para o corretor não digitar nome/CRECI/telefone em todo anúncio, esses dados
são preenchidos **uma única vez** na aba **Perfil** (`ProfileScreen.jsx` →
seção "Meus dados de corretor") e ficam salvos em `profiles.broker_name`,
`profiles.broker_phone` e `profiles.creci`.

- Se algum desses campos ainda não foi preenchido, um aviso aparece no topo
  do formulário "Novo Imóvel", com atalho direto para a aba Perfil.
- Ao gerar os textos com IA, `App.jsx` anexa automaticamente esses dados ao
  payload enviado (`handleGenerate`), e tanto o prompt da Edge Function
  quanto o modo mock (`generateMockTexts`) incluem o nome, telefone e CRECI
  do corretor ao final dos 3 textos gerados — sem precisar repetir a cada
  imóvel cadastrado.

**Sobre o campo "Área (m²)":** já existe desde a primeira versão do
formulário (`NewPropertyForm.jsx`), junto com Quartos/Banheiros/Vagas — é
opcional, o corretor preenche só se quiser.

## 8. Compressão de imagens no cliente

Antes de qualquer foto ser enviada ao Storage, `src/utils/imageCompression.js`:

- converte para **WebP**;
- redimensiona para **largura máxima de 1200px** (mantendo proporção);
- aplica **qualidade 0.8**.

Implementação nativa com `Canvas`/`createImageBitmap` (sem dependências
extras). Há um bloco comentado no arquivo mostrando como trocar pela
biblioteca `browser-image-compression`, se preferir.

## 9. Exclusão completa de imóveis (Storage + Database)

O botão **"Excluir Imóvel"** chama `deleteProperty(property)` em
`propertyService.js`, que:

1. remove as fotos do bucket `property-photos` no Storage;
2. remove o registro do imóvel na tabela `properties`.

## 10. Sobre a chamada de IA e a Edge Function

`src/services/aiService.js` exporta:

- `generatePropertyTexts(property)` → chama a **Edge Function do Supabase**
  `generate-property-texts` (não a OpenAI diretamente), que retorna
  `{ instagram, portal, whatsapp }`.
- `generateMockTexts(property)` → gera textos fake localmente, sem custo,
  útil para desenvolver a interface.

### Protegendo a chave da OpenAI

A chave da OpenAI **não fica no frontend**. Ela é configurada como _secret_
da Edge Function em `supabase/functions/generate-property-texts/index.ts`,
que roda no servidor do Supabase e nunca é exposta ao navegador.

**Passo a passo do deploy:**

1. Instale a Supabase CLI (se ainda não tiver):

   ```bash
   npm install -g supabase
   ```

2. Faça login e vincule o projeto:

   ```bash
   supabase login
   supabase link --project-ref SEU_PROJECT_REF
   ```

   (o `PROJECT_REF` fica em Project Settings > General no painel do Supabase)

3. Configure a chave da OpenAI como secret da function:

   ```bash
   supabase secrets set OPENAI_API_KEY=sk-sua-chave-aqui
   ```

4. Faça o deploy da function:

   ```bash
   supabase functions deploy generate-property-texts
   ```

5. Pronto — o frontend já está configurado para chamar
   `supabase.functions.invoke('generate-property-texts', ...)` automaticamente
   (via `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, que você já tem no `.env`).
   Não é preciso nenhuma variável de OpenAI no `.env` do frontend.

**Testando localmente antes do deploy (opcional):**

```bash
supabase functions serve generate-property-texts --env-file ./supabase/.env
```

Crie `supabase/.env` (não commitado) com `OPENAI_API_KEY=sk-...` para testar
a function localmente antes de subir pra produção.

## 11. Estrutura de pastas

```
imobquick/
├── sql/
│   └── schema.sql                # profiles + properties + RLS + storage + indicação
├── supabase/
│   └── functions/
│       └── generate-property-texts/
│           └── index.ts          # Edge Function: chama a OpenAI com a chave protegida
├── src/
│   ├── components/
│   │   ├── AuthScreen.jsx        # login / cadastro (com captura de ?ref=)
│   │   ├── SubscriptionGate.jsx  # tela de assinatura expirada/inativa
│   │   ├── DeviceBlockedScreen.jsx # tela de dispositivo não autorizado
│   │   ├── AdminPanel.jsx        # painel administrativo (perfis + dispositivos)
│   │   ├── DeviceApprovalList.jsx  # aba "Dispositivos" do painel admin
│   │   ├── BottomNav.jsx         # navegação inferior (4 abas)
│   │   ├── NewPropertyForm.jsx   # formulário de cadastro
│   │   ├── AIResultsModal.jsx    # modal com os 3 textos gerados
│   │   ├── PropertyList.jsx      # listagem de imóveis
│   │   ├── PropertyCard.jsx      # card individual do imóvel
│   │   ├── ReferralSection.jsx   # aba "Indique e Ganhe"
│   │   └── ProfileScreen.jsx     # aba "Perfil" + assinatura + dados do corretor
│   ├── services/
│   │   ├── authService.js        # login/cadastro/logout
│   │   ├── profileService.js     # assinatura, indicação, dados do corretor e funções admin
│   │   ├── deviceService.js      # registro/checagem/aprovação de dispositivos
│   │   ├── aiService.js          # chamada à API de IA (OpenAI)
│   │   └── propertyService.js    # CRUD + upload/exclusão (Storage + DB)
│   ├── utils/
│   │   └── imageCompression.js   # compressão WebP (1200px, qualidade 0.8)
│   ├── supabaseClient.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── tailwind.config.js
└── vite.config.js
```

## 12. Rodando localmente

```bash
npm run dev
```

## 13. Build de produção

```bash
npm run build
```

Os arquivos finais ficam em `dist/`, prontos para deploy.

## 14. Subindo pro GitHub e publicando (Vercel)

**GitHub:**

```bash
git init
git add .
git commit -m "ImobQuick"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/imobquick.git
git push -u origin main
```

O `.gitignore` já está configurado para **não** subir `node_modules/`, `dist/`
nem o `.env` (que tem suas chaves secretas — nunca deve ir pro GitHub).

**Vercel (recomendado para projetos Vite):**

1. Acesse [vercel.com](https://vercel.com), conecte sua conta GitHub e importe o repositório
2. A Vercel detecta automaticamente que é um projeto Vite (build command
   `npm run build`, output `dist`) — não precisa mudar nada
3. Antes de fazer o deploy, vá em **Settings > Environment Variables** e
   cadastre as mesmas variáveis do seu `.env` local:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_URL` (use a URL final do seu domínio na Vercel, ex:
     `https://imobquick.vercel.app`)
   - `VITE_CHECKOUT_URL`
4. Clique em **Deploy**

⚠️ **Sem as variáveis de ambiente configuradas na Vercel, o app builda mas
não funciona** (a conexão com Supabase fica em branco). Esse é o erro mais
comum em primeiro deploy — se a tela ficar em branco ou travar carregando,
confira isso primeiro.

**Depois do primeiro deploy:** qualquer novo `git push` na branch `main`
já dispara um novo deploy automático — não precisa repetir o processo.
