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
${dadosCorretor}
Gere os textos seguindo EXATAMENTE estas diretrizes e responda SOMENTE em JSON válido,
sem markdown, sem texto extra, no seguinte formato:

{
  "instagram": "texto para Instagram: envolvente, com emojis, linguagem informal, terminando com um bloco de 8 a 12 hashtags do mercado imobiliário${brokerName ? ', e antes das hashtags inclua a linha com os dados do corretor' : ''}",
  "portal": "texto para portais como ZAP/OLX: técnico, estruturado em tópicos com marcadores, profissional, sem emojis em excesso, destacando características objetivas do imóvel${brokerName ? ', terminando com os dados do corretor' : ''}",
  "whatsapp": "texto curto para WhatsApp: persuasivo, direto, no máximo 4-5 linhas, terminando com uma chamada para ação clara (ex: convite para agendar visita)${brokerName ? ' e, na linha seguinte, os dados do corretor' : ''}"
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
