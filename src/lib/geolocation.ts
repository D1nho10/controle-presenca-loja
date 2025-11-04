import { supabase } from './supabase'
import type { LodgeSettings } from './supabase'

export async function getLodgeSettings(): Promise<LodgeSettings> {
  const { data, error } = await supabase
    .from('lodge_settings')
    .select('*')
    .single()

  if (error) {
    // Retornar configurações padrão se não conseguir carregar
    return {
      id: 'default',
      name: 'A.R.L.S. Acílio Cândido Ventura nº 3569',
      latitude: -22.999000,
      longitude: -48.875000,
      radius_meters: 100,
      session_start_time: '19:30:00',
      session_end_time: '21:00:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  return data
}

export async function updateLodgeSettings(updates: Partial<LodgeSettings>): Promise<LodgeSettings> {
  // Apenas admins podem atualizar
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    throw new Error('Apenas administradores podem atualizar configurações')
  }

  const { data, error } = await supabase
    .from('lodge_settings')
    .update(updates)
    .eq('id', (await getLodgeSettings()).id)
    .select()
    .single()

  if (error) throw error
  return data
}

export function checkLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.permissions) {
      resolve(false)
      return
    }

    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      resolve(result.state === 'granted')
    }).catch(() => {
      resolve(false)
    })
  })
}

export function requestLocationPermission(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutos
    })
  })
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

export async function validateLocation(latitude: number, longitude: number): Promise<{
  isValid: boolean
  distance: number
  settings: LodgeSettings
}> {
  const settings = await getLodgeSettings()
  const distance = calculateDistance(latitude, longitude, settings.latitude, settings.longitude)

  return {
    isValid: distance <= settings.radius_meters,
    distance: Math.round(distance),
    settings
  }
}