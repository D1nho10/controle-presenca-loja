'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, Settings, BarChart3, AlertCircle, CheckCircle, Clock, MapPin } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getAllUsers, createUser, updateUser, deleteUser } from '@/lib/auth'
import { getAllAttendances } from '@/lib/attendance'
import { getLodgeSettings, updateLodgeSettings } from '@/lib/geolocation'
import type { Profile, LodgeSettings } from '@/lib/supabase'

interface UserWithStats extends Profile {
  totalAttendances?: number
  lastAttendance?: string
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users')
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [lodgeSettings, setLodgeSettings] = useState<LodgeSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    cargo: '',
    role: 'user' as 'admin' | 'user'
  })

  const [settingsForm, setSettingsForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '',
    session_start_time: '',
    session_end_time: ''
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/')
    } else if (user?.role === 'admin') {
      loadData()
    }
  }, [user, loading, router])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [usersData, settingsData, attendancesData] = await Promise.all([
        getAllUsers(),
        getLodgeSettings(),
        getAllAttendances(1000) // Carregar muitas para estatísticas
      ])

      // Adicionar estatísticas aos usuários
      const usersWithStats = usersData.map(user => {
        const userAttendances = attendancesData.filter(att => att.user_id === user.id)
        return {
          ...user,
          totalAttendances: userAttendances.length,
          lastAttendance: userAttendances.length > 0
            ? new Date(userAttendances[0].marked_at).toLocaleDateString('pt-BR')
            : 'Nunca'
        }
      })

      setUsers(usersWithStats)
      setLodgeSettings(settingsData)
      setSettingsForm({
        name: settingsData.name,
        latitude: settingsData.latitude.toString(),
        longitude: settingsData.longitude.toString(),
        radius_meters: settingsData.radius_meters.toString(),
        session_start_time: settingsData.session_start_time.slice(0, 5),
        session_end_time: settingsData.session_end_time.slice(0, 5)
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await createUser(formData.email, formData.password, {
        full_name: formData.full_name,
        cargo: formData.cargo,
        role: formData.role,
        status: 'active'
      })

      setFormData({
        email: '',
        password: '',
        full_name: '',
        cargo: '',
        role: 'user'
      })
      setShowCreateUser(false)
      loadData()
    } catch (error: any) {
      alert('Erro ao criar usuário: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsLoading(true)
    try {
      await updateUser(editingUser.id, {
        full_name: formData.full_name,
        cargo: formData.cargo,
        role: formData.role
      })

      setEditingUser(null)
      setFormData({
        email: '',
        password: '',
        full_name: '',
        cargo: '',
        role: 'user'
      })
      loadData()
    } catch (error: any) {
      alert('Erro ao atualizar usuário: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    setIsLoading(true)
    try {
      await deleteUser(userId)
      loadData()
    } catch (error: any) {
      alert('Erro ao excluir usuário: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateLodgeSettings({
        name: settingsForm.name,
        latitude: parseFloat(settingsForm.latitude),
        longitude: parseFloat(settingsForm.longitude),
        radius_meters: parseInt(settingsForm.radius_meters),
        session_start_time: settingsForm.session_start_time + ':00',
        session_end_time: settingsForm.session_end_time + ':00'
      })

      loadData()
      alert('Configurações atualizadas com sucesso!')
    } catch (error: any) {
      alert('Erro ao atualizar configurações: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const startEditUser = (user: UserWithStats) => {
    setEditingUser(user)
    setFormData({
      email: '', // Não permite editar email
      password: '', // Não permite editar senha
      full_name: user.full_name,
      cargo: user.cargo || '',
      role: user.role
    })
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
                <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
                <p className="text-yellow-400 text-sm">A.R.L.S. Acílio Cândido Ventura nº 3569</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-yellow-400 hover:text-yellow-300 px-4 py-2 rounded-lg border border-yellow-400/30 hover:bg-yellow-400/10 transition-colors"
              >
                Voltar ao Início
              </button>
              <button
                onClick={() => router.push('/admin/reports')}
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-500 hover:to-blue-700 transition-colors"
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Relatórios
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Gerenciar Usuários
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5 inline mr-2" />
            Configurações
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Header com botão criar */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Usuários Cadastrados</h2>
              <button
                onClick={() => setShowCreateUser(true)}
                className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-500 hover:to-green-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Novo Usuário
              </button>
            </div>

            {/* Lista de usuários */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-yellow-400/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-semibold">Nome</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Cargo</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Função</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Presenças</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Última Presença</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-6 py-4 text-white">{user.full_name}</td>
                        <td className="px-6 py-4 text-white/80">{user.cargo || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-yellow-400/20 text-yellow-400'
                              : 'bg-blue-400/20 text-blue-400'
                          }`}>
                            {user.role === 'admin' ? 'Administrador' : 'Membro'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white">{user.totalAttendances || 0}</td>
                        <td className="px-6 py-4 text-white/80">{user.lastAttendance}</td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditUser(user)}
                              className="text-blue-400 hover:text-blue-300 text-sm underline"
                            >
                              Editar
                            </button>
                            {user.id !== user.id && ( // Não permitir excluir a si mesmo
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-400 hover:text-red-300 text-sm underline"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Criar/Editar Usuário */}
            {(showCreateUser || editingUser) && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-yellow-400/20">
                  <h3 className="text-xl font-bold text-white mb-6">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h3>

                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                    {!editingUser && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">E-mail</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">Senha</label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            required={!editingUser}
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Nome Completo</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Cargo</label>
                      <input
                        type="text"
                        value={formData.cargo}
                        onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Ex: Mestre, Vigilante, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Função</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'user'})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="user">Membro</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold py-3 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateUser(false)
                          setEditingUser(null)
                          setFormData({
                            email: '',
                            password: '',
                            full_name: '',
                            cargo: '',
                            role: 'user'
                          })
                        }}
                        className="flex-1 bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Configurações da Loja</h2>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/20">
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Nome da Loja</label>
                    <input
                      type="text"
                      value={settingsForm.name}
                      onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Raio de Presença (metros)</label>
                    <input
                      type="number"
                      value={settingsForm.radius_meters}
                      onChange={(e) => setSettingsForm({...settingsForm, radius_meters: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Latitude</label>
                    <input
                      type="text"
                      value={settingsForm.latitude}
                      onChange={(e) => setSettingsForm({...settingsForm, latitude: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Longitude</label>
                    <input
                      type="text"
                      value={settingsForm.longitude}
                      onChange={(e) => setSettingsForm({...settingsForm, longitude: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Horário Início Sessão</label>
                    <input
                      type="time"
                      value={settingsForm.session_start_time}
                      onChange={(e) => setSettingsForm({...settingsForm, session_start_time: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Horário Fim Sessão</label>
                    <input
                      type="time"
                      value={settingsForm.session_end_time}
                      onChange={(e) => setSettingsForm({...settingsForm, session_end_time: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold py-3 px-8 rounded-lg hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}