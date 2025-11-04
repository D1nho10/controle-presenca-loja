import { supabase, type LodgeSettings } from './supabase'

// Calcular distância entre duas coordenadas usando fórmula de Haversine
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distância em metros
}

// Obter localização atual do usuário
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada neste navegador'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        let message = 'Erro ao obter localização'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permissão de localização negada. Por favor, permita o acesso à localização.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Localização não disponível.'
            break
          case error.TIMEOUT:
            message = 'Tempo limite para obter localização.'
            break
        }
        reject(new Error(message))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  })
}

// Obter configurações da loja
export async function getLodgeSettings(): Promise<LodgeSettings> {
  const { data, error } = await supabase
    .from('lodge_settings')
    .select('*')
    .single()

  if (error) {
    // Se não existir configuração, criar uma padrão
    const defaultSettings = {
      name: 'A.R.L.S. Acílio Cândido Ventura nº 3569',
      latitude: -23.551234,
      longitude: -46.635789,
      radius_meters: 100,
      session_start_time: '19:30:00',
      session_end_time: '21:00:00'
    }

    const { data: newData, error: insertError } = await supabase
      .from('lodge_settings')
      .insert(defaultSettings)
      .select()
      .single()

    if (insertError) throw insertError
    return newData
  }

  return data
}

// Verificar se usuário está dentro da área permitida
export async function isWithinAllowedArea(
  userLat: number,
  userLon: number
): Promise<{ isValid: boolean; distance: number; settings: LodgeSettings }> {
  const settings = await getLodgeSettings()
  
  const distance = calculateDistance(
    userLat,
    userLon,
    settings.latitude,
    settings.longitude
  )

  return {
    isValid: distance <= settings.radius_meters,
    distance,
    settings
  }
}

// Verificar se está no horário permitido para marcação
export function isWithinAllowedTime(startTime: string, endTime: string): boolean {
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
  
  return currentTime >= startTime.slice(0, 5) && currentTime <= endTime.slice(0, 5)
}

// Validar localização e horário para marcação de presença
export async function validateAttendanceConditions(
  userLat: number,
  userLon: number
): Promise<{
  isValid: boolean
  reason?: string
  distance?: number
  settings: LodgeSettings
}> {
  try {
    const settings = await getLodgeSettings()
    
    // Verificar horário
    const isTimeValid = isWithinAllowedTime(
      settings.session_start_time,
      settings.session_end_time
    )
    
    if (!isTimeValid) {
      return {
        isValid: false,
        reason: 'Fora do horário permitido (19h30 às 21h00)',
        settings
      }
    }
    
    // Verificar localização
    const locationCheck = await isWithinAllowedArea(userLat, userLon)
    
    if (!locationCheck.isValid) {
      return {
        isValid: false,
        reason: `Fora da área permitida (${Math.round(locationCheck.distance)}m da loja)`,
        distance: locationCheck.distance,
        settings
      }
    }
    
    return {
      isValid: true,
      distance: locationCheck.distance,
      settings
    }
  } catch (error) {
    return {
      isValid: false,
      reason: 'Erro ao validar condições',
      settings: await getLodgeSettings()
    }
  }
}