import { supabase } from './supabase'
import type { Attendance, Session } from './supabase'

export interface AttendanceStats {
  monthly: {
    present: number
    total: number
    percentage: number
  }
  yearly: {
    present: number
    total: number
    percentage: number
  }
  totalAttendances: number
}

export interface AttendanceRecord extends Attendance {
  profiles?: {
    full_name: string
    cargo?: string
  }
  sessions?: Session
}

export async function markAttendance(): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar se usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: 'Usuário não autenticado' }
    }

    // Obter localização atual
    if (!navigator.geolocation) {
      return { success: false, message: 'Geolocalização não suportada neste dispositivo' }
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      })
    })

    const { latitude, longitude } = position.coords

    // Verificar configurações da loja
    const { data: settings, error: settingsError } = await supabase
      .from('lodge_settings')
      .select('*')
      .single()

    if (settingsError || !settings) {
      return { success: false, message: 'Erro ao carregar configurações da loja' }
    }

    // Calcular distância
    const distance = calculateDistance(
      latitude,
      longitude,
      settings.latitude,
      settings.longitude
    )

    // Verificar horário
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 8)
    const startTime = settings.session_start_time
    const endTime = settings.session_end_time

    const isWithinTime = currentTime >= startTime && currentTime <= endTime
    const isWithinRadius = distance <= settings.radius_meters

    // Obter ou criar sessão do dia
    const today = now.toISOString().split('T')[0]
    let { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', today)
      .single()

    if (sessionError && sessionError.code !== 'PGRST116') { // PGRST116 = not found
      return { success: false, message: 'Erro ao verificar sessão' }
    }

    let sessionId: string
    if (!session) {
      // Criar nova sessão
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          date: today,
          type: 'regular',
          status: 'active'
        })
        .select('id')
        .single()

      if (createError) {
        return { success: false, message: 'Erro ao criar sessão' }
      }
      sessionId = newSession.id
    } else {
      sessionId = session.id
    }

    // Verificar se já marcou presença hoje
    const { data: existingAttendance } = await supabase
      .from('attendances')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single()

    if (existingAttendance) {
      return { success: false, message: 'Presença já foi marcada para hoje' }
    }

    // Determinar status
    let status: 'present' | 'invalid_location' | 'invalid_time' = 'present'
    let message = 'Presença marcada com sucesso!'

    if (!isWithinTime) {
      status = 'invalid_time'
      message = 'Presença não autorizada — horário inválido.'
    } else if (!isWithinRadius) {
      status = 'invalid_location'
      message = 'Presença não autorizada — localização inválida.'
    }

    // Registrar tentativa inválida se necessário
    if (status !== 'present') {
      await supabase
        .from('invalid_attempts')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          latitude,
          longitude,
          distance_meters: Math.round(distance),
          reason: status === 'invalid_time' ? 'Horário inválido' : 'Localização inválida'
        })
    }

    // Registrar presença
    const { error: attendanceError } = await supabase
      .from('attendances')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        latitude,
        longitude,
        distance_meters: Math.round(distance),
        status,
        marked_at: now.toISOString()
      })

    if (attendanceError) {
      return { success: false, message: 'Erro ao registrar presença' }
    }

    return { success: true, message }
  } catch (error: any) {
    console.error('Erro ao marcar presença:', error)
    return { success: false, message: error.message || 'Erro desconhecido' }
  }
}

export async function getAttendanceStats(): Promise<AttendanceStats> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Estatísticas mensais
  const startOfMonth = new Date(currentYear, now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: monthlySessions } = await supabase
    .from('sessions')
    .select('id')
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  const { data: monthlyAttendances } = await supabase
    .from('attendances')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'present')
    .gte('marked_at', `${startOfMonth}T00:00:00`)
    .lte('marked_at', `${endOfMonth}T23:59:59`)

  const monthlyTotal = monthlySessions?.length || 0
  const monthlyPresent = monthlyAttendances?.length || 0
  const monthlyPercentage = monthlyTotal > 0 ? Math.round((monthlyPresent / monthlyTotal) * 100) : 0

  // Estatísticas anuais
  const startOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0]
  const endOfYear = new Date(currentYear, 11, 31).toISOString().split('T')[0]

  const { data: yearlySessions } = await supabase
    .from('sessions')
    .select('id')
    .gte('date', startOfYear)
    .lte('date', endOfYear)

  const { data: yearlyAttendances } = await supabase
    .from('attendances')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'present')
    .gte('marked_at', `${startOfYear}T00:00:00`)
    .lte('marked_at', `${endOfYear}T23:59:59`)

  const yearlyTotal = yearlySessions?.length || 0
  const yearlyPresent = yearlyAttendances?.length || 0
  const yearlyPercentage = yearlyTotal > 0 ? Math.round((yearlyPresent / yearlyTotal) * 100) : 0

  // Total de presenças
  const { count: totalAttendances } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'present')

  return {
    monthly: {
      present: monthlyPresent,
      total: monthlyTotal,
      percentage: monthlyPercentage
    },
    yearly: {
      present: yearlyPresent,
      total: yearlyTotal,
      percentage: yearlyPercentage
    },
    totalAttendances: totalAttendances || 0
  }
}

export async function getAllAttendances(limit = 50, offset = 0): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select(`
      *,
      profiles:user_id (
        full_name,
        cargo
      ),
      sessions (
        date,
        type
      )
    `)
    .order('marked_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}

export async function getUserAttendances(userId: string, limit = 50, offset = 0): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select(`
      *,
      sessions (
        date,
        type
      )
    `)
    .eq('user_id', userId)
    .order('marked_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}

export async function getMonthlyReport(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  const { data: attendances } = await supabase
    .from('attendances')
    .select(`
      user_id,
      status,
      profiles:user_id (
        full_name,
        cargo
      )
    `)
    .in('session_id', sessions?.map(s => s.id) || [])
    .eq('status', 'present')

  // Agrupar por usuário
  const userStats = new Map()

  attendances?.forEach(attendance => {
    const userId = attendance.user_id
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        user: attendance.profiles,
        present: 0
      })
    }
    userStats.get(userId).present += 1
  })

  const totalSessions = sessions?.length || 0
  const report = Array.from(userStats.entries()).map(([userId, stats]) => ({
    userId,
    user: stats.user,
    present: stats.present,
    total: totalSessions,
    percentage: totalSessions > 0 ? Math.round((stats.present / totalSessions) * 100) : 0
  }))

  return report
}

export async function getYearlyReport(year: number) {
  const reports = []

  for (let month = 1; month <= 12; month++) {
    const monthlyReport = await getMonthlyReport(year, month)
    reports.push({
      month,
      data: monthlyReport
    })
  }

  return reports
}

// Função auxiliar para calcular distância entre duas coordenadas (fórmula de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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