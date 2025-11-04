import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

// Tipos TypeScript para o banco de dados
export interface Profile {
  id: string
  full_name: string
  cargo?: string
  phone?: string
  role: 'admin' | 'user'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface LodgeSettings {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  session_start_time: string
  session_end_time: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  date: string
  type: 'regular' | 'extraordinary' | 'installation'
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  user_id: string
  session_id: string
  latitude: number
  longitude: number
  distance_meters: number
  status: 'present' | 'invalid_location' | 'invalid_time'
  marked_at: string
  created_at: string
  profiles?: Profile
  sessions?: Session
}

export interface InvalidAttempt {
  id: string
  user_id: string
  session_id?: string
  latitude: number
  longitude: number
  distance_meters: number
  reason: string
  attempted_at: string
  profiles?: Profile
}