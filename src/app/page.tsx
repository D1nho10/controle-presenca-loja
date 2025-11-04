'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, Users, CheckCircle, AlertCircle, LogOut, Settings, BarChart3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { markAttendance, getAttendanceStats } from '@/lib/attendance'
import { getLodgeSettings } from '@/lib/geolocation'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lodgeSettings, setLodgeSettings] = useState<any>(null)

  // Atualizar horário a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      loadUserData()
      loadLodgeSettings()
    }
  }, [user])

  // Redirect para login se não autenticado (movido para useEffect)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const loadUserData = async () => {
    try {
      const userStats = await getAttendanceStats()
      setStats(userStats)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const loadLodgeSettings = async () => {
    try {
      const settings = await getLodgeSettings()
      setLodgeSettings(settings)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const handleMarkAttendance = async () => {
    setIsMarkingAttendance(true)
    setMessage(null)

    try {
      const result = await markAttendance()
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        loadUserData() // Recarregar estatísticas
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao marcar presença' })
    } finally {
      setIsMarkingAttendance(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Verificar se está no horário permitido
  const isWithinAllowedTime = () => {
    if (!lodgeSettings) return false
    
    const now = currentTime.toTimeString().slice(0, 5)
    const startTime = lodgeSettings.session_start_time.slice(0, 5)
    const endTime = lodgeSettings.session_end_time.slice(0, 5)
    
    return now >= startTime && now <= endTime
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Redirecionando...</p>
        </div>
      </div>
    )
  }

  const timeAllowed = isWithinAllowedTime()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-yellow-400/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  A.R.L.S. Acílio Cândido Ventura nº 3569
                </h1>
                <p className="text-yellow-400 text-sm">Sistema de Controle de Presença</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white font-medium">{user.profile?.full_name}</p>
                <p className="text-yellow-400 text-sm">{user.profile?.cargo || 'Irmão'}</p>
              </div>
              
              <div className="flex space-x-2">
                {user.profile?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => router.push('/admin')}
                      className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-colors"
                      title="Painel Administrativo"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => router.push('/admin/reports')}
                      className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-colors"
                      title="Relatórios"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={handleSignOut}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensagem de boas-vindas */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bem-vindo à A.R.L.S. Acílio Cândido Ventura nº 3569
          </h2>
          <p className="text-xl text-yellow-400 mb-2">
            Marque sua presença digitalmente e fortaleça nossa união.
          </p>
          <div className="flex items-center justify-center space-x-4 text-white/80">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>{currentTime.toLocaleTimeString('pt-BR')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>São Paulo, SP</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Painel principal - Marcação de presença */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/20">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-black" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">Marcar Presença</h3>
                
                {/* Status do horário */}
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6 ${
                  timeAllowed 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {timeAllowed ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Horário permitido para marcação</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Fora do horário (19h30 às 21h00)</span>
                    </>
                  )}
                </div>

                {/* Mensagem de resultado */}
                {message && (
                  <div className={`p-4 rounded-lg mb-6 ${
                    message.type === 'success' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-center space-x-2">
                      {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      <span>{message.text}</span>
                    </div>
                  </div>
                )}

                {/* Botão de marcação */}
                <button
                  onClick={handleMarkAttendance}
                  disabled={!timeAllowed || isMarkingAttendance}
                  className={`w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all ${
                    timeAllowed && !isMarkingAttendance
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700 hover:scale-105 shadow-lg hover:shadow-xl'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isMarkingAttendance ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      <span>Marcando presença...</span>
                    </div>
                  ) : (
                    'Marcar Presença'
                  )}
                </button>

                {!timeAllowed && (
                  <p className="text-white/60 text-sm mt-4">
                    O registro de presença está disponível apenas das 19h30 às 21h00.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Painel lateral - Estatísticas */}
          <div className="space-y-6">
            {/* Estatísticas pessoais */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-yellow-400" />
                Suas Estatísticas
              </h4>
              
              {stats ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-white/80 mb-1">
                      <span>Presença Mensal</span>
                      <span>{stats.monthly.percentage}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all"
                        style={{ width: `${stats.monthly.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      {stats.monthly.present} de {stats.monthly.total} sessões
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm text-white/80 mb-1">
                      <span>Presença Anual</span>
                      <span>{stats.yearly.percentage}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${stats.yearly.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      {stats.yearly.present} de {stats.yearly.total} sessões
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-white/20">
                    <p className="text-white/80 text-sm">
                      Total de presenças: <span className="text-yellow-400 font-semibold">{stats.totalAttendances}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-white/20 rounded mb-2"></div>
                    <div className="h-4 bg-white/20 rounded mb-2"></div>
                    <div className="h-4 bg-white/20 rounded"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Informações da sessão */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-yellow-400" />
                Sessão de Hoje
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/80">Data:</span>
                  <span className="text-white">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Horário:</span>
                  <span className="text-white">19h30 - 21h00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Tipo:</span>
                  <span className="text-white">Sessão Regular</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Status:</span>
                  <span className={`${timeAllowed ? 'text-green-400' : 'text-yellow-400'}`}>
                    {timeAllowed ? 'Ativa' : 'Aguardando'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}