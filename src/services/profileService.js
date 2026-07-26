import { supabase } from '../supabaseClient'

/**
 * Busca o perfil (assinatura, role, indicação) do usuário logado.
 */
export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Verifica se o perfil tem uma assinatura ativa e dentro do prazo.
 * Regra: subscription_status === 'active' E subscription_ends_at > agora.
 */
export function hasActiveSubscription(profile) {
  if (!profile) return false
  if (profile.subscription_status !== 'active') return false
  if (!profile.subscription_ends_at) return false
  return new Date(profile.subscription_ends_at) > new Date()
}

export function isAdmin(profile) {
  return profile?.role === 'admin'
}

/**
 * Monta o link de indicação único do corretor.
 * Ex: https://imobquick.com.br/register?ref=AB12C3
 */
export function buildReferralLink(profile) {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
  return `${baseUrl}/register?ref=${profile?.referral_code ?? ''}`
}

/**
 * Quantos indicados pagos faltam para o próximo par (que libera +30 dias).
 * Ex: 0 pagos -> "0/2" | 1 pago -> "1/2" | 2 pagos -> "0/2" (já processado o par)
 */
export function referralProgress(profile) {
  const count = profile?.paid_referrals_count ?? 0
  const current = count % 2
  return { current, target: 2, remaining: 2 - current }
}

/**
 * Salva os dados do corretor (nome, WhatsApp e CRECI) no perfil.
 * Preenchidos uma única vez, passam a aparecer automaticamente em todos
 * os textos de divulgação gerados pela IA — sem precisar repetir a cada anúncio.
 */
export async function updateBrokerInfo(userId, { brokerName, brokerPhone, creci }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      broker_name: brokerName?.trim() || null,
      broker_phone: brokerPhone?.trim() || null,
      creci: creci?.trim() || null,
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Indica se o corretor já preencheu nome + CRECI — usado para exibir um
 * aviso incentivando o preenchimento antes de gerar o primeiro anúncio.
 */
export function hasBrokerInfo(profile) {
  return Boolean(profile?.broker_name && profile?.creci)
}

// ============================================================
// Funções administrativas (exigem role = 'admin' + política RLS)
// ============================================================

/**
 * Lista todos os perfis. Opcionalmente filtra por e-mail (busca parcial).
 */
export async function listAllProfiles(emailFilter) {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (emailFilter && emailFilter.trim()) {
    query = query.ilike('email', `%${emailFilter.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Concede N dias grátis a um perfil (via RPC `grant_free_days` no banco).
 * Usado pelo botão "🎁 Conceder 7 Dias Grátis" no painel Admin.
 */
export async function grantFreeDays(userId, days = 7) {
  const { error } = await supabase.rpc('grant_free_days', {
    target_user_id: userId,
    days_to_add: days,
  })
  if (error) throw error
}

/**
 * Ativação manual / demonstração ilimitada: define uma data de expiração
 * bem distante e garante o status ativo.
 */
export async function grantUnlimitedDemo(userId) {
  const farFuture = new Date()
  farFuture.setFullYear(farFuture.getFullYear() + 10)

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_ends_at: farFuture.toISOString(),
    })
    .eq('id', userId)

  if (error) throw error
}
