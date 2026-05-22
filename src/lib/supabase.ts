export { supabase } from '../utils/supabase'

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


