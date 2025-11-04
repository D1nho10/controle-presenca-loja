import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { latitude, longitude } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Coordenadas obrigatórias' }, { status: 400 })
    }

    // Verificar horário (19:30 - 21:00)
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    const startTime = '19:30'
    const endTime = '21:00'

    if (currentTime < startTime || currentTime > endTime) {
      // Salvar tentativa inválida
      await supabase.from('presencas').insert({
        user_id: session.user.id,
        data: now.toISOString().split('T')[0],
        presente: false,
        hora_marcacao: now.toISOString(),
        latitude,
        longitude,
        metodo: 'invalid_time',
        observacoes: `Tentativa fora do horário: ${currentTime}`
      })
      return NextResponse.json({ 
        success: false, 
        message: 'Presença não autorizada — horário inválido (19:30 às 21:00)' 
      }, { status: 400 })
    }

    // Verificar geolocalização (raio de 100m da loja)
    const lodgeLat = -22.999000
    const lodgeLng = -48.875000
    const radius = 100 // metros

    const distance = getDistance(lodgeLat, lodgeLng, latitude, longitude)
    if (distance > radius) {
      // Salvar tentativa inválida
      await supabase.from('presencas').insert({
        user_id: session.user.id,
        data: now.toISOString().split('T')[0],
        presente: false,
        hora_marcacao: now.toISOString(),
        latitude,
        longitude,
        metodo: 'invalid_geo',
        observacoes: `Distância: ${distance.toFixed(2)}m (máx: ${radius}m)`
      })
      return NextResponse.json({ 
        success: false, 
        message: 'Presença não autorizada — localização inválida' 
      }, { status: 400 })
    }

    // Verificar se já marcou presença hoje
    const today = now.toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('presencas')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('data', today)
      .eq('presente', true)

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Presença já registrada para hoje' 
      }, { status: 400 })
    }

    // Registrar presença
    const { error } = await supabase.from('presencas').insert({
      user_id: session.user.id,
      data: today,
      presente: true,
      hora_marcacao: now.toISOString(),
      latitude,
      longitude,
      metodo: 'geo'
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Presença registrada com sucesso!' 
    })

  } catch (error: any) {
    console.error('Erro ao marcar presença:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Função para calcular distância entre duas coordenadas (em metros)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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