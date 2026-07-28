// ============================================================
// Supabase Edge Function: asaas-webhook
// Recebe as notificações de pagamento do Asaas, ativa/renova a
// assinatura do corretor correspondente e processa o bônus de
// indicação (+30 dias a cada 2 indicados pagos) na primeira
// cobrança confirmada de cada indicado.
//
// Configure no painel do Asaas (Integrações > Webhooks):
//   URL: https://SEU_PROJECT_REF.supabase.co/functions/v1/asaas-webhook
//   Token de autenticação: o mesmo valor de ASAAS_WEBHOOK_TOKEN (secret)
// ============================================================

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN')

// Troque para a URL de produção do Asaas quando sair do sandbox:
// https://api.asaas.com/v3
const ASAAS_API_URL = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3'

// Eventos do Asaas que consideramos "pagamento confirmado"
const CONFIRMED_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido' }, 405)
  }

  // ------------------------------------------------------------
  // 1) Valida a autenticidade do webhook (token configurado no Asaas)
  // ------------------------------------------------------------
  const receivedToken = req.headers.get('asaas-access-token')
  if (!ASAAS_WEBHOOK_TOKEN || receivedToken !== ASAAS_WEBHOOK_TOKEN) {
    return jsonResponse({ error: 'Token de webhook inválido' }, 401)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Variáveis de ambiente do Supabase não configuradas' }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const payload = await req.json()
    const event = payload?.event as string
    const payment = payload?.payment

    // Só processa eventos de pagamento confirmado; outros eventos
    // (criado, vencido, estornado etc.) são apenas confirmados com 200 OK.
    if (!CONFIRMED_EVENTS.includes(event) || !payment) {
      return jsonResponse({ received: true, ignored: true, event })
    }

    const asaasCustomerId: string | undefined = payment.customer

    if (!asaasCustomerId) {
      return jsonResponse({ error: 'Payload sem customer id' }, 400)
    }

    // ------------------------------------------------------------
    // 2) Localiza o perfil vinculado a esse cliente do Asaas.
    // Se ainda não houver vínculo salvo, busca o e-mail do cliente
    // na API do Asaas e casa com profiles.email — e salva o vínculo
    // pra próxima vez ser direto.
    // ------------------------------------------------------------
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, referred_by, referral_bonus_processed, subscription_ends_at')
      .eq('asaas_customer_id', asaasCustomerId)
      .maybeSingle()

    if (!profile) {
      if (!ASAAS_API_KEY) {
        return jsonResponse({ error: 'ASAAS_API_KEY não configurada para buscar o cliente' }, 500)
      }

      const customerResponse = await fetch(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        headers: { access_token: ASAAS_API_KEY },
      })

      if (!customerResponse.ok) {
        return jsonResponse({ error: 'Não foi possível buscar o cliente no Asaas' }, 502)
      }

      const customer = await customerResponse.json()
      const customerEmail: string | undefined = customer?.email

      if (!customerEmail) {
        return jsonResponse({ error: 'Cliente do Asaas sem e-mail cadastrado' }, 400)
      }

      const { data: matchedProfile, error: matchError } = await supabase
        .from('profiles')
        .select('id, referred_by, referral_bonus_processed, subscription_ends_at')
        .eq('email', customerEmail)
        .maybeSingle()

      if (matchError || !matchedProfile) {
        return jsonResponse(
          { error: `Nenhum perfil ImobQuick encontrado para o e-mail ${customerEmail}` },
          404
        )
      }

      profile = matchedProfile

      // Salva o vínculo para os próximos webhooks desse mesmo cliente
      await supabase
        .from('profiles')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', profile.id)
    }

    // ------------------------------------------------------------
    // 3) Ativa/renova a assinatura por +30 dias a partir de hoje
    // (ou a partir do vencimento atual, se ainda não tiver expirado)
    // ------------------------------------------------------------
    const now = new Date()
    const currentEndsAt = profile.subscription_ends_at ? new Date(profile.subscription_ends_at) : now
    const baseDate = currentEndsAt > now ? currentEndsAt : now
    const newEndsAt = new Date(baseDate)
    newEndsAt.setDate(newEndsAt.getDate() + 30)

    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_ends_at: newEndsAt.toISOString(),
      })
      .eq('id', profile.id)

    // ------------------------------------------------------------
    // 4) Processa o bônus de indicação — só na PRIMEIRA cobrança
    // paga deste indicado, pra não conceder o bônus toda renovação.
    // ------------------------------------------------------------
    if (profile.referred_by && !profile.referral_bonus_processed) {
      await supabase.rpc('process_paid_referral', { referrer_code: profile.referred_by })
      await supabase
        .from('profiles')
        .update({ referral_bonus_processed: true })
        .eq('id', profile.id)
    }

    return jsonResponse({ received: true, profileId: profile.id, subscriptionEndsAt: newEndsAt })
  } catch (err) {
    return jsonResponse({ error: 'Erro inesperado', details: String(err) }, 500)
  }
})
