// ============================================================
// aiService.js
// Gera os 3 textos de divulgação chamando a Supabase Edge Function
// "generate-property-texts" (supabase/functions/generate-property-texts).
//
// A chave da OpenAI NÃO fica mais no frontend: ela é lida como secret
// dentro da Edge Function, no servidor. Veja o passo a passo de deploy
// no README (seção "Protegendo a chave da OpenAI").
// ============================================================

import { supabase } from '../supabaseClient'

/**
 * Chama a Edge Function do Supabase, que por sua vez chama a OpenAI
 * com a chave protegida no servidor, e retorna { instagram, portal, whatsapp }.
 */
export async function generatePropertyTexts(property) {
  const { data, error } = await supabase.functions.invoke('generate-property-texts', {
    body: { property },
  })

  if (error) {
    throw new Error(`Erro ao gerar textos com IA: ${error.message}`)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return {
    instagram: data?.instagram ?? '',
    portal: data?.portal ?? '',
    whatsapp: data?.whatsapp ?? '',
  }
}

/**
 * ------------------------------------------------------------
 * MODO DEMO (fallback offline, sem custo)
 * ------------------------------------------------------------
 * Útil para testar a interface sem chamar a Edge Function/OpenAI.
 * Troque generatePropertyTexts por generateMockTexts em App.jsx
 * enquanto estiver desenvolvendo.
 */
export function generateMockTexts(property) {
  const {
    title,
    location,
    price,
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
  } = property
  const precoFormatado = Number(price || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const rodapeCorretor =
    brokerName || creci
      ? `\n\n📱 ${brokerName || ''}${brokerPhone ? ' - ' + brokerPhone : ''}${creci ? `\n🪪 CRECI ${creci}` : ''}`
      : ''

  const infoSubsidio = acceptsSubsidy
    ? `\n\n💰 Aceita subsídio/financiamento facilitado!${
        minIncome
          ? ` Renda mínima: ${Number(minIncome).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
          : ''
      }${
        subsidyValue
          ? ` Subsídio de até ${Number(subsidyValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
          : ''
      }${downPaymentInfo ? ` ${downPaymentInfo}.` : ''}`
    : ''

  return Promise.resolve({
    instagram: `✨ ${title} em ${location}! 🏡\n\n${bedrooms} quartos | ${bathrooms} banheiros | ${vacancies} vagas | ${area}m²\n\n${details || 'Um imóvel incrível esperando por você!'} 💙\n\n📍 ${location}\n💰 ${precoFormatado}${infoSubsidio}${rodapeCorretor}\n\n#imoveis #corretordeimoveis #casanova #apartamento #investimento #decoracao #arquitetura #imobiliaria #vendaimoveis #lardocelar`,
    portal: `${title}\n\nLocalização: ${location}\n\nCaracterísticas:\n- Quartos: ${bedrooms}\n- Banheiros: ${bathrooms}\n- Vagas de garagem: ${vacancies}\n- Área útil: ${area} m²\n\nDiferenciais:\n${details || 'Não informado'}\n\nValor: ${precoFormatado}${infoSubsidio}\n\nEntre em contato para mais informações ou agendamento de visita.${rodapeCorretor}`,
    whatsapp: `${title} em ${location} 🏡\n\n${details || 'Um imóvel com ótimo custo-benefício'}, por ${precoFormatado}.${infoSubsidio}\n\nVocê teria disponibilidade essa semana pra conhecer pessoalmente?${rodapeCorretor}`,
  })
}
