import { createClient } from '@supabase/supabase-js'

// Lê as credenciais das variáveis de ambiente (Vite).
// Crie um arquivo .env na raiz do projeto com base no .env.example
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[ImobQuick] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. ' +
    'Crie um arquivo .env com base no .env.example.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const PHOTOS_BUCKET = 'property-photos'
