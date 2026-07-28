// ============================================================
// Supabase Edge Function: generate-property-texts
// Recebe os dados do imóvel, chama a OpenAI com a chave GUARDADA
// NO SERVIDOR (nunca exposta ao navegador) e devolve
// { instagram, portal, whatsapp }.
// ============================================================

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// CORS: ajuste ALLOWED_ORIGIN para o domínio do seu app em produção
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function buildPrompt(property: Record<string, unknown>) {
  const {
    title,
    type,
    purpose,
    price,
    location,
    bedrooms,
    bathrooms,
    vacancies,
    area,
    details,
    brokerName,
    brokerPhone,
    creci,
    acceptsSubsidy,
    minIncome,
    subsidyValue,
    downPaymentInfo,
  } = property as {
    title: string
    type: string
    purpose: string
    price: number
    location: string
    bedrooms: number
    bathrooms: number
    vacancies: number
    area: number
    details?: string
    brokerName?: string
    brokerPhone?: string
    creci?: string
    acceptsSubsidy?: boolean
    minIncome?: number | null
    subsidyValue?: number | null
    downPaymentInfo?: string | null
  }

  const precoFormatado = Number(price || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const dadosCorretor =
    brokerName || creci
      ? `
DADOS DO CORRETOR (inclua ao final de CADA um dos 3 textos, em uma linha própria,
no formato "📱 ${brokerName ?? ''}${brokerPhone ? ' - ' + brokerPhone : ''}" seguida de
"🪪 CRECI ${creci ?? ''}" quando o CRECI estiver preenchido):
- Nome: ${brokerName || 'Não informado'}
- Telefone/WhatsApp: ${brokerPhone || 'Não informado'}
- CRECI: ${creci || 'Não informado'}
`
      : ''

  const dadosSubsidio = acceptsSubsidy
    ? `
FINANCIAMENTO / SUBSÍDIO (esse imóvel aceita — mencione isso de forma natural
em pelo menos um ponto de cada um dos 3 textos, é um forte chamativo pro
público de imóveis populares/Minha Casa Minha Vida; NÃO invente valores além
dos informados abaixo):
- Aceita subsídio/financiamento facilitado: sim
${minIncome ? `- Renda mínima necessária: ${Number(minIncome).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
${subsidyValue ? `- Valor do subsídio disponível: até ${Number(subsidyValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
${downPaymentInfo ? `- Condição de entrada: ${downPaymentInfo}` : ''}
`
    : ''

  return `
Você é um redator especialista em marketing imobiliário no Brasil.
Com base nos dados do imóvel abaixo, gere 3 textos de divulgação distintos.

DADOS DO IMÓVEL:
- Título: ${title}
- Tipo: ${type}
- Finalidade: ${purpose}
- Valor: ${precoFormatado}
- Localização: ${location}
- Quartos: ${bedrooms}
- Banheiros: ${bathrooms}
- Vagas de garagem: ${vacancies}
- Área: ${area} m²
- Diferenciais: ${details || 'Não informado'}
${dadosSubsidio}${dadosCorretor}
Gere os textos seguindo EXATAMENTE estas diretrizes e responda SOMENTE em JSON válido,
sem markdown, sem texto extra, no seguinte formato:

{
  "instagram": "texto para Instagram: comece com um gancho forte na primeira linha (uma pergunta, uma promessa ou o maior diferencial do imóvel), não com 'Confira este imóvel'. Use quebras de linha curtas (estilo legenda de post, não parágrafo corrido), 2-3 emojis relevantes espalhados (não um em cada linha), destaque no máximo 3 diferenciais reais do imóvel (não invente características que não foram informadas), e feche com 8-12 hashtags de mercado imobiliário${brokerName ? ', com a linha dos dados do corretor logo antes das hashtags' : ''}",
  "portal": "texto para portais como ZAP/OLX: primeiro parágrafo com uma frase de impacto sobre o imóvel (não repita o título), depois lista em tópicos com marcadores das características objetivas (quartos, banheiros, vagas, área, localização${acceptsSubsidy ? ', e condições de financiamento/subsídio' : ''}), um parágrafo curto com os diferenciais reais, tom profissional e confiável, sem emojis em excesso${brokerName ? ', terminando com os dados do corretor' : ''}",
  "whatsapp": "texto para WhatsApp escrito como se o corretor estivesse mandando pessoalmente pra um cliente interessado — natural, caloroso, NUNCA robótico ou genérico. Regras obrigatórias: (1) comece direto pelo que há de mais atrativo no imóvel, sem saudação genérica tipo 'Olá, tenho uma oportunidade'; (2) mencione no máximo 2-3 detalhes concretos do imóvel (localização + 1-2 diferenciais reais, nunca invente características não informadas); (3) use quebras de linha entre ideias, não escreva tudo em bloco único; (4) crie senso de urgência ou oportunidade genuína SEM soar falso ou forçado (ex: mencionar que é ótimo momento por causa do preço ou condição, não 'corre que já era'); (5) termine com UMA pergunta curta, simples e gramaticalmente correta que convide resposta imediata — use exatamente um destes formatos ou muito parecido: 'Qual o melhor dia pra você conhecer?', 'Posso te mostrar essa semana?', 'Topa agendar uma visita?', 'Prefere ver essa semana ou no fim de semana?'. NUNCA combine duas perguntas na mesma frase (proibido misturar 'qual' com 'quando' ou 'que dia' com 'que horário' na mesma pergunta — isso soa quebrado e sem lógica); releia a pergunta final antes de responder e confirme que ela faz sentido gramatical perfeito lida em voz alta; (6) no máximo 5-6 linhas curtas no total${acceptsSubsidy ? '; (7) mencione rapidamente a condição de subsídio/financiamento em algum ponto' : ''}${brokerName ? '; (8) na linha seguinte à pergunta final, inclua os dados do corretor' : ''}"
}
`.trim()
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY não configurada nos secrets da function' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { property } = await req.json()

    if (!property) {
      return new Response(JSON.stringify({ error: 'Campo "property" é obrigatório' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const prompt = buildPrompt(property)

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente que gera textos de marketing imobiliário e responde APENAS em JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text()
      return new Response(
        JSON.stringify({ error: `Erro na API da OpenAI (${openaiResponse.status})`, details: errorBody }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const data = await openaiResponse.json()
    const rawContent = data?.choices?.[0]?.message?.content

    if (!rawContent) {
      return new Response(JSON.stringify({ error: 'Resposta da IA veio vazia' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const parsed = JSON.parse(rawContent)

    const result = {
      instagram: parsed.instagram ?? '',
      portal: parsed.portal ?? '',
      whatsapp: parsed.whatsapp ?? '',
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro inesperado', details: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
