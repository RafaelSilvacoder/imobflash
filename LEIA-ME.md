# Campos opcionais de Financiamento / Subsídio

## O que foi adicionado

Na aba **Novo Imóvel**, agora tem uma seção retrátil "Financiamento /
Subsídio (opcional)" — clique pra abrir. Dentro dela:
- Checkbox "Este imóvel aceita subsídio (Minha Casa Minha Vida)"
- Se marcado, aparecem: Renda mínima, Valor do subsídio, Condição de entrada
  (todos opcionais também)

Quando preenchido, a IA passa a **mencionar isso naturalmente** nos 3 textos
gerados (Instagram, Portal, WhatsApp) — sem inventar valores que você não
informou. Os imóveis com subsídio marcado também ganham um selo verde
"💰 Subsídio" no card, na aba "Meus Imóveis".

## Arquivos deste pacote — substitua pelos de mesmo nome:

- `src/App.jsx`
- `src/components/NewPropertyForm.jsx`
- `src/components/PropertyCard.jsx`
- `src/services/aiService.js`
- `sql/schema.sql`
- `supabase/functions/generate-property-texts/index.ts`

## Passos depois de copiar os arquivos

### 1. Rodar o SQL (adiciona as colunas novas)
No SQL Editor do Supabase, rode o `sql/schema.sql` inteiro — é seguro rodar
por cima do que você já tem (só adiciona as colunas que faltam:
`accepts_subsidy`, `min_income`, `subsidy_value`, `down_payment_info`).

### 2. Redeploy da Edge Function (o prompt da IA mudou)
```bash
npx -y supabase functions deploy generate-property-texts
```

### 3. Subir pro GitHub
```bash
git add .
git commit -m "Adiciona campos opcionais de subsídio/financiamento"
git push
```

Pronto — não precisa mexer em variáveis de ambiente nem no Asaas pra essa
funcionalidade.
