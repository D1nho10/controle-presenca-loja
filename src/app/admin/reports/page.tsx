'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  Calendar,
  TrendingUp,
  MapPin,
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getAllAttendances, getInvalidAttempts } from '@/lib/attendance'
import { getAllProfiles, isAdmin } from '@/lib/auth'
import { exportToPDF, exportToExcel, getLodgeStats } from '@/lib/reports'
import type { Attendance, InvalidAttempt, Profile } from '@/lib/supabase'

export default function ReportsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [invalidAttempts, setInvalidAttempts] = useState<InvalidAttempt[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'attendances' | 'invalid'>('overview')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      checkAdminAccess()
      loadData()
    }
  }, [user, loading])

  const checkAdminAccess = async () => {
    const adminStatus = await isAdmin()
    if (!adminStatus) {
      router.push('/')
    }
  }

  const loadData = async () => {
    try {
      setIsLoadingData(true)
      
      const [attendancesData, invalidData, profilesData, statsData] = await Promise.all([
        getAllAttendances(),
        getInvalidAttempts(),
        getAllProfiles(),
        getLodgeStats()
      ])
      
      setAttendances(attendancesData)
      setInvalidAttempts(invalidData)
      setProfiles(profilesData)
      setStats(statsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      await exportToPDF()
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      await exportToExcel()
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando relatórios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-yellow-400/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-8 h-8 text-yellow-400" />
                <div>
                  <h1 className="text-xl font-bold text-white">Relatórios e Estatísticas</h1>
                  <p className="text-yellow-400 text-sm">A.R.L.S. Acílio Cândido Ventura nº 3569</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/10 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Visão Geral</span>
          </button>
          <button
            onClick={() => setActiveTab('attendances')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'attendances'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Presenças</span>
          </button>
          <button
            onClick={() => setActiveTab('invalid')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'invalid'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Tentativas Inválidas</span>
          </button>
        </div>

        {/* Conteúdo das tabs */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total de Membros</p>
                    <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
                  </div>
                  <Users className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-green-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Membros Ativos</p>
                    <p className="text-2xl font-bold text-white">{stats.activeMembers}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Presenças Mensais</p>
                    <p className="text-2xl font-bold text-white">{stats.monthlyStats.attendances}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Presença Média</p>
                    <p className="text-2xl font-bold text-white">{stats.monthlyStats.averageAttendance}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Gráficos e estatísticas detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
                <h3 className="text-lg font-semibold text-white mb-4">Estatísticas Mensais</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-white/80 mb-2">
                      <span>Presenças Únicas</span>
                      <span>{stats.monthlyStats.uniqueAttendees} de {stats.activeMembers}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all"
                        style={{ width: `${stats.monthlyStats.averageAttendance}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/20">
                    <p className="text-white/80 text-sm">
                      Total de registros: <span className="text-yellow-400 font-semibold">{stats.monthlyStats.attendances}</span>
                    </p>
                    <p className="text-white/80 text-sm">
                      Frequência média: <span className="text-yellow-400 font-semibold">{stats.monthlyStats.averageAttendance}%</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/20">
                <h3 className="text-lg font-semibold text-white mb-4">Estatísticas Anuais</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-white/80 mb-2">
                      <span>Presenças Únicas</span>
                      <span>{stats.yearlyStats.uniqueAttendees} de {stats.activeMembers}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${stats.yearlyStats.averageAttendance}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/20">
                    <p className="text-white/80 text-sm">
                      Total de registros: <span className="text-blue-400 font-semibold">{stats.yearlyStats.attendances}</span>
                    </p>
                    <p className="text-white/80 text-sm">
                      Frequência média: <span className="text-blue-400 font-semibold">{stats.yearlyStats.averageAttendance}%</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendances' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Histórico de Presenças</h2>
              <p className="text-white/60">Total: {attendances.length} registros</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-yellow-400/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Data/Hora</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Nome</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Cargo</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Distância</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {attendances.slice(0, 50).map((attendance: any) => (
                      <tr key={attendance.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-white text-sm">
                          <div>
                            <p>{new Date(attendance.marked_at).toLocaleDateString('pt-BR')}</p>
                            <p className="text-white/60 text-xs">
                              {new Date(attendance.marked_at).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white">{attendance.profiles?.full_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-white/80">{attendance.profiles?.cargo || '-'}</td>
                        <td className="px-6 py-4 text-white/80">
                          {Math.round(attendance.distance_meters || 0)}m
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400">
                            Presente
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {attendances.length > 50 && (
                <div className="p-4 text-center text-white/60 text-sm border-t border-white/10">
                  Mostrando 50 de {attendances.length} registros. Exporte para ver todos.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'invalid' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Tentativas Inválidas</h2>
              <p className="text-white/60">Total: {invalidAttempts.length} tentativas</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-red-400/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Data/Hora</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Nome</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Motivo</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Distância</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Localização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {invalidAttempts.slice(0, 50).map((attempt: any) => (
                      <tr key={attempt.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-white text-sm">
                          <div>
                            <p>{new Date(attempt.attempted_at).toLocaleDateString('pt-BR')}</p>
                            <p className="text-white/60 text-xs">
                              {new Date(attempt.attempted_at).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white">{attempt.profiles?.full_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-red-400 text-sm">{attempt.reason}</td>
                        <td className="px-6 py-4 text-white/80">
                          {Math.round(attempt.distance_meters || 0)}m
                        </td>
                        <td className="px-6 py-4 text-white/60 text-xs">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{attempt.latitude?.toFixed(6)}, {attempt.longitude?.toFixed(6)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {invalidAttempts.length > 50 && (
                <div className="p-4 text-center text-white/60 text-sm border-t border-white/10">
                  Mostrando 50 de {invalidAttempts.length} registros. Exporte para ver todos.
                </div>
              )}
              
              {invalidAttempts.length === 0 && (
                <div className="p-8 text-center text-white/60">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-white/40" />
                  <p>Nenhuma tentativa inválida registrada.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}