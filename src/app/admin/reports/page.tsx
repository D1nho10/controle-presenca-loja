'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Calendar, Users, TrendingUp, FileText, BarChart3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getMonthlyReport, getYearlyReport } from '@/lib/attendance'
import * as XLSX from 'xlsx'

interface MonthlyReport {
  userId: string
  user: {
    full_name: string
    cargo?: string
  }
  present: number
  total: number
  percentage: number
}

interface YearlyReport {
  month: number
  data: MonthlyReport[]
}

export default function ReportsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport[]>([])
  const [yearlyReport, setYearlyReport] = useState<YearlyReport[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/')
    } else if (user?.role === 'admin') {
      loadReports()
    }
  }, [user, loading, selectedYear, selectedMonth, reportType, router])

  const loadReports = async () => {
    setIsLoading(true)
    try {
      if (reportType === 'monthly') {
        const report = await getMonthlyReport(selectedYear, selectedMonth)
        setMonthlyReport(report)
      } else {
        const report = await getYearlyReport(selectedYear)
        setYearlyReport(report)
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    let data: any[] = []
    let filename = ''

    if (reportType === 'monthly') {
      data = monthlyReport.map(item => ({
        'Nome': item.user.full_name,
        'Cargo': item.cargo || '-',
        'Presenças': item.present,
        'Total de Sessões': item.total,
        'Percentual': `${item.percentage}%`
      }))
      filename = `relatorio_mensal_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`
    } else {
      // Para relatório anual, criar uma planilha com múltiplas abas ou uma visão consolidada
      const consolidatedData: { [key: string]: any } = {}

      yearlyReport.forEach(monthData => {
        monthData.data.forEach(item => {
          const key = item.userId
          if (!consolidatedData[key]) {
            consolidatedData[key] = {
              'Nome': item.user.full_name,
              'Cargo': item.cargo || '-'
            }
          }
          consolidatedData[key][`Mês ${monthData.month}`] = `${item.percentage}%`
        })
      })

      data = Object.values(consolidatedData)
      filename = `relatorio_anual_${selectedYear}.csv`
    }

    // Criar e baixar CSV
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, reportType === 'monthly' ? 'Relatório Mensal' : 'Relatório Anual')
    XLSX.writeFile(wb, filename.replace('.csv', '.xlsx'))
  }

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return months[month - 1]
  }

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando...</p>
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
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Relatórios de Presença</h1>
                <p className="text-yellow-400 text-sm">A.R.L.S. Acílio Cândido Ventura nº 3569</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-yellow-400 hover:text-yellow-300 px-4 py-2 rounded-lg border border-yellow-400/30 hover:bg-yellow-400/10 transition-colors"
              >
                Voltar ao Admin
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-500 hover:to-blue-700 transition-colors"
              >
                Início
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controles */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex space-x-4">
              <button
                onClick={() => setReportType('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  reportType === 'monthly'
                    ? 'bg-yellow-400 text-black'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Relatório Mensal
              </button>
              <button
                onClick={() => setReportType('yearly')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  reportType === 'yearly'
                    ? 'bg-yellow-400 text-black'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Relatório Anual
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-white font-medium">Ano:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {reportType === 'monthly' && (
                <div className="flex items-center space-x-2">
                  <label className="text-white font-medium">Mês:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={exportToCSV}
                className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-500 hover:to-green-700 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Relatório Mensal */}
        {reportType === 'monthly' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Relatório de {getMonthName(selectedMonth)} de {selectedYear}
              </h2>
              <div className="text-right">
                <p className="text-white/80">Total de membros: {monthlyReport.length}</p>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                  <p className="text-white">Carregando relatório...</p>
                </div>
              </div>
            ) : monthlyReport.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/20">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white">Nenhum dado encontrado para o período selecionado.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-yellow-400/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black/20">
                      <tr>
                        <th className="px-6 py-4 text-left text-white font-semibold">Nome</th>
                        <th className="px-6 py-4 text-left text-white font-semibold">Cargo</th>
                        <th className="px-6 py-4 text-center text-white font-semibold">Presenças</th>
                        <th className="px-6 py-4 text-center text-white font-semibold">Total Sessões</th>
                        <th className="px-6 py-4 text-center text-white font-semibold">Percentual</th>
                        <th className="px-6 py-4 text-center text-white font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyReport
                        .sort((a, b) => b.percentage - a.percentage)
                        .map((item) => (
                        <tr key={item.userId} className="border-t border-white/10 hover:bg-white/5">
                          <td className="px-6 py-4 text-white font-medium">{item.user.full_name}</td>
                          <td className="px-6 py-4 text-white/80">{item.cargo || '-'}</td>
                          <td className="px-6 py-4 text-center text-white">{item.present}</td>
                          <td className="px-6 py-4 text-center text-white">{item.total}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-semibold ${
                              item.percentage >= 80 ? 'text-green-400' :
                              item.percentage >= 60 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {item.percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.percentage >= 80 ? 'bg-green-500/20 text-green-400' :
                              item.percentage >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {item.percentage >= 80 ? 'Excelente' :
                               item.percentage >= 60 ? 'Bom' : 'Atenção'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Relatório Anual */}
        {reportType === 'yearly' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Relatório Anual de {selectedYear}
              </h2>
              <div className="text-right">
                <p className="text-white/80">Visão consolidada do ano</p>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                  <p className="text-white">Carregando relatório...</p>
                </div>
              </div>
            ) : yearlyReport.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/20">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white">Nenhum dado encontrado para o ano selecionado.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumo anual por membro */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-yellow-400" />
                    Média Anual por Membro
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      const memberAverages = new Map<string, { name: string; cargo?: string; averages: number[] }>()

                      yearlyReport.forEach(month => {
                        month.data.forEach(item => {
                          if (!memberAverages.has(item.userId)) {
                            memberAverages.set(item.userId, {
                              name: item.user.full_name,
                              cargo: item.cargo,
                              averages: []
                            })
                          }
                          memberAverages.get(item.userId)!.averages.push(item.percentage)
                        })
                      })

                      return Array.from(memberAverages.entries())
                        .map(([userId, data]) => ({
                          userId,
                          name: data.name,
                          cargo: data.cargo,
                          average: data.averages.reduce((a, b) => a + b, 0) / data.averages.length
                        }))
                        .sort((a, b) => b.average - a.average)
                        .map(item => (
                          <div key={item.userId} className="bg-black/20 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-white font-medium">{item.name}</p>
                                <p className="text-white/60 text-sm">{item.cargo || '-'}</p>
                              </div>
                              <span className={`text-lg font-bold ${
                                item.average >= 80 ? 'text-green-400' :
                                item.average >= 60 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {item.average.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  item.average >= 80 ? 'bg-green-400' :
                                  item.average >= 60 ? 'bg-yellow-400' :
                                  'bg-red-400'
                                }`}
                                style={{ width: `${Math.min(item.average, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                    })()}
                  </div>
                </div>

                {/* Tabela mensal detalhada */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-yellow-400/20 overflow-hidden">
                  <div className="p-6 border-b border-white/10">
                    <h3 className="text-xl font-semibold text-white">Detalhamento por Mês</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-black/20">
                        <tr>
                          <th className="px-6 py-4 text-left text-white font-semibold">Membro</th>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <th key={month} className="px-4 py-4 text-center text-white font-semibold text-sm">
                              {getMonthName(month).slice(0, 3)}
                            </th>
                          ))}
                          <th className="px-6 py-4 text-center text-white font-semibold">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const memberData = new Map<string, { name: string; cargo?: string; months: { [key: number]: number } }>()

                          yearlyReport.forEach(month => {
                            month.data.forEach(item => {
                              if (!memberData.has(item.userId)) {
                                memberData.set(item.userId, {
                                  name: item.user.full_name,
                                  cargo: item.cargo,
                                  months: {}
                                })
                              }
                              memberData.get(item.userId)!.months[month.month] = item.percentage
                            })
                          })

                          return Array.from(memberData.entries())
                            .sort((a, b) => a[1].name.localeCompare(b[1].name))
                            .map(([userId, data]) => {
                              const monthsArray = Object.values(data.months)
                              const average = monthsArray.length > 0
                                ? monthsArray.reduce((a, b) => a + b, 0) / monthsArray.length
                                : 0

                              return (
                                <tr key={userId} className="border-t border-white/10 hover:bg-white/5">
                                  <td className="px-6 py-4 text-white font-medium">
                                    <div>
                                      <p>{data.name}</p>
                                      <p className="text-white/60 text-sm">{data.cargo || '-'}</p>
                                    </div>
                                  </td>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <td key={month} className="px-4 py-4 text-center text-white text-sm">
                                      {data.months[month] !== undefined ? `${data.months[month]}%` : '-'}
                                    </td>
                                  ))}
                                  <td className="px-6 py-4 text-center">
                                    <span className={`font-semibold ${
                                      average >= 80 ? 'text-green-400' :
                                      average >= 60 ? 'text-yellow-400' :
                                      'text-red-400'
                                    }`}>
                                      {average.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              )
                            })
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}