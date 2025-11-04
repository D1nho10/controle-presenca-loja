import { supabase, type Session, type Attendance, type InvalidAttempt } from './supabase'
import { getCurrentUser } from './auth'
import { validateAttendanceConditions, getCurrentLocation } from './geolocation'

// Obter sessão ativa ou criar uma para hoje
export async function getTodaySession(): Promise<Session> {
  const today = new Date().toISOString().split('T')[0]
  
  // Verificar se já existe sessão para hoje
  let { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('date', today)
    .single()
  
  if (error && error.code === 'PGRST116') {
    // Não existe sessão, criar uma nova
    const { data: newSession, error: createError } = await supabase
      .from('sessions')
      .insert({
        date: today,
        type: 'regular',
        status: 'active'
      })
      .select()
      .single()
    
    if (createError) throw createError
    session = newSession
  } else if (error) {
    throw error
  }
  
  return session!
}

// Marcar presença
export async function markAttendance(): Promise<{
  success: boolean
  message: string
  attendance?: Attendance
}> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: 'Usuário não autenticado' }
    }

    // Obter localização atual
    const position = await getCurrentLocation()
    const { latitude, longitude } = position.coords

    // Validar condições (horário e localização)
    const validation = await validateAttendanceConditions(latitude, longitude)
    
    if (!validation.isValid) {
      // Registrar tentativa inválida
      await supabase.from('invalid_attempts').insert({
        user_id: user.id,
        latitude,
        longitude,
        distance_meters: validation.distance || 0,
        reason: validation.reason || 'Condições não atendidas'
      })
      
      return { 
        success: false, 
        message: validation.reason || 'Condições não atendidas para marcação de presença' 
      }
    }

    // Obter sessão de hoje
    const session = await getTodaySession()

    // Verificar se já marcou presença hoje
    const { data: existingAttendance } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_id', session.id)
      .single()

    if (existingAttendance) {
      return { 
        success: false, 
        message: 'Você já marcou presença nesta sessão' 
      }
    }

    // Marcar presença
    const { data: attendance, error } = await supabase
      .from('attendances')
      .insert({
        user_id: user.id,
        session_id: session.id,
        latitude,
        longitude,
        distance_meters: validation.distance || 0,
        status: 'present'
      })
      .select(`
        *,
        profiles:user_id (full_name, cargo),
        sessions:session_id (date, type)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Presença marcada com sucesso!',
      attendance
    }
  } catch (error: any) {
    console.error('Erro ao marcar presença:', error)
    return {
      success: false,
      message: error.message || 'Erro ao marcar presença'
    }
  }
}

// Obter presenças do usuário atual
export async function getUserAttendances(userId?: string): Promise<Attendance[]> {
  const user = await getCurrentUser()
  const targetUserId = userId || user?.id
  
  if (!targetUserId) return []

  const { data, error } = await supabase
    .from('attendances')
    .select(`
      *,
      profiles:user_id (full_name, cargo),
      sessions:session_id (date, type, status)
    `)
    .eq('user_id', targetUserId)
    .order('marked_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Obter todas as presenças (apenas para admins)
export async function getAllAttendances(): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select(`
      *,
      profiles:user_id (full_name, cargo),
      sessions:session_id (date, type, status)
    `)
    .order('marked_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Obter tentativas inválidas (apenas para admins)
export async function getInvalidAttempts(): Promise<InvalidAttempt[]> {
  const { data, error } = await supabase
    .from('invalid_attempts')
    .select(`
      *,
      profiles:user_id (full_name, cargo)
    `)
    .order('attempted_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Obter estatísticas de presença
export async function getAttendanceStats(userId?: string) {
  const user = await getCurrentUser()
  const targetUserId = userId || user?.id
  
  if (!targetUserId) return null

  // Obter presenças do usuário
  const attendances = await getUserAttendances(targetUserId)
  
  // Calcular estatísticas mensais e anuais
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  const monthlyAttendances = attendances.filter(att => {
    const attDate = new Date(att.marked_at)
    return attDate.getMonth() === currentMonth && attDate.getFullYear() === currentYear
  })
  
  const yearlyAttendances = attendances.filter(att => {
    const attDate = new Date(att.marked_at)
    return attDate.getFullYear() === currentYear
  })
  
  // Obter total de sessões do mês e ano
  const { data: monthlySessions } = await supabase
    .from('sessions')
    .select('*')
    .gte('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
    .lt('date', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`)
  
  const { data: yearlySessions } = await supabase
    .from('sessions')
    .select('*')
    .gte('date', `${currentYear}-01-01`)
    .lt('date', `${currentYear + 1}-01-01`)
  
  const monthlyTotal = monthlySessions?.length || 0
  const yearlyTotal = yearlySessions?.length || 0
  
  return {
    monthly: {
      present: monthlyAttendances.length,
      total: monthlyTotal,
      percentage: monthlyTotal > 0 ? Math.round((monthlyAttendances.length / monthlyTotal) * 100) : 0
    },
    yearly: {
      present: yearlyAttendances.length,
      total: yearlyTotal,
      percentage: yearlyTotal > 0 ? Math.round((yearlyAttendances.length / yearlyTotal) * 100) : 0
    },
    totalAttendances: attendances.length
  }
}