import { createClient } from '@supabase/supabase-js'

const getSupabaseCredentials = () => {
  let url = import.meta.env.VITE_SUPABASE_URL
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY

  const isValidUrl = (str: string) => {
    try {
      const u = new URL(str)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  if (!url || url === 'TU_SUPABASE_URL_AQUI' || !isValidUrl(url)) {
    console.warn(
      '⚠️ [Supabase] VITE_SUPABASE_URL no está configurado o es inválido en el archivo .env. Usando URL de fallback para evitar que la aplicación falle al iniciar.'
    )
    url = 'https://tu-proyecto-temporal.supabase.co'
  }

  if (!key || key === 'TU_SUPABASE_ANON_KEY_AQUI') {
    console.warn(
      '⚠️ [Supabase] VITE_SUPABASE_ANON_KEY no está configurado en el archivo .env.'
    )
    key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
  }

  return { url, key }
}

const credentials = getSupabaseCredentials()

export const supabase = createClient(credentials.url, credentials.key)

// Tipos para TypeScript
export interface AppointmentRow {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_name: string
  service_price: number
  service_duration: number
  service_icon: string
  date: string
  time: string
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  ip_address?: string | null // IP del usuario que creó el turno
  created_at: string
  updated_at: string
  deleted_at?: string | null // Fecha de eliminación (null = no eliminado)
}

export interface CustomTimeRangeRow {
  id: string
  day: 'friday' | 'saturday'
  start: string // HH:mm
  end: string   // HH:mm
  created_at?: string
}


