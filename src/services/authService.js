import { supabase } from '../supabaseClient'

/**
 * Lê o parâmetro ?ref=CODIGO da URL atual, se existir.
 * Usado para vincular o novo cadastro a quem o indicou.
 */
export function getReferralCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('ref') || null
  } catch {
    return null
  }
}

/**
 * Cadastra um novo corretor por e-mail e senha.
 * O código de indicação (se houver) é enviado como metadata do usuário
 * e lido pela trigger `handle_new_user` no banco (ver sql/schema.sql),
 * que grava em `profiles.referred_by`.
 */
export async function signUp(email, password, referredBy) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: referredBy ? { referred_by: referredBy } : undefined,
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
