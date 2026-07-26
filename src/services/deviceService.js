import { supabase } from '../supabaseClient'

const DEVICE_ID_KEY = 'imobquick_device_id'

/**
 * Gera (ou lê) um identificador único para este navegador/dispositivo,
 * persistido em localStorage. Não é uma trava criptográfica inquebrável,
 * mas é suficiente para impedir o compartilhamento casual de uma única
 * conta entre vários corretores.
 */
export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
  } catch {
    // Ambientes sem localStorage (raro): gera um id só para esta sessão
    return crypto.randomUUID()
  }
}

/**
 * Monta um rótulo legível do dispositivo (apenas informativo, exibido
 * pro admin ao decidir se aprova ou não).
 */
export function getDeviceLabel() {
  const ua = navigator.userAgent || ''
  const isAndroid = /Android/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isMobile = /Mobi/i.test(ua)

  let platform = 'Desktop'
  if (isAndroid) platform = 'Android'
  else if (isIOS) platform = 'iOS'
  else if (isMobile) platform = 'Mobile'

  let browser = 'Navegador'
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Edg/i.test(ua)) browser = 'Edge'

  return `${browser} · ${platform}`
}

/**
 * Registra (ou apenas verifica) o dispositivo atual para o usuário logado.
 * Retorna 'approved' | 'blocked' | 'rejected' | 'revoked'.
 *
 * Os 2 primeiros dispositivos de cada conta são aprovados automaticamente;
 * a partir do 3º, fica pendente de aprovação do admin.
 */
export async function registerCurrentDevice() {
  const deviceId = getOrCreateDeviceId()
  const deviceLabel = getDeviceLabel()

  const { data, error } = await supabase.rpc('register_or_check_device', {
    p_device_id: deviceId,
    p_device_label: deviceLabel,
  })

  if (error) throw error
  return data // string com o status
}

// ============================================================
// Funções administrativas (exigem role = 'admin' + política RLS)
// ============================================================

/**
 * Lista dispositivos de todos os usuários, com o e-mail do dono.
 * Opcionalmente filtra apenas os pendentes/bloqueados.
 *
 * Feito em 2 consultas (devices + profiles) porque `known_devices.user_id`
 * referencia `auth.users`, não `profiles` diretamente — não dá pra usar
 * um join automático do PostgREST entre as duas tabelas.
 */
export async function listDevices({ onlyPending = false } = {}) {
  let query = supabase
    .from('known_devices')
    .select('*')
    .order('last_seen_at', { ascending: false })

  if (onlyPending) {
    query = query.in('status', ['blocked', 'rejected'])
  }

  const { data: devices, error } = await query
  if (error) throw error
  if (!devices || devices.length === 0) return []

  const userIds = [...new Set(devices.map((d) => d.user_id))]
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds)

  if (profilesError) throw profilesError

  const emailByUserId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email]))

  return devices.map((d) => ({ ...d, owner_email: emailByUserId[d.user_id] ?? '—' }))
}

export async function approveDevice(deviceRowId) {
  const { error } = await supabase.rpc('admin_approve_device', {
    target_device_row_id: deviceRowId,
  })
  if (error) throw error
}

export async function rejectDevice(deviceRowId) {
  const { error } = await supabase.rpc('admin_reject_device', {
    target_device_row_id: deviceRowId,
  })
  if (error) throw error
}
