'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Settings, 
  MapPin, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  ArrowLeft,
  Shield,
  UserPlus,
  Calendar,
  BarChart3
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getAllProfiles, signUp, isAdmin } from '@/lib/auth'
import { getLodgeSettings, supabase } from '@/lib/supabase'
import type { Profile, LodgeSettings } from '@/lib/supabase'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'sessions'>('members')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [lodgeSettings, setLodgeSettings] = useState<LodgeSettings | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Estados para formulários
  const [showAddMember, setShowAddMember] = useState(false)
  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    cargo: '',
    phone: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    status: 'active' as 'active' | 'inactive'
  })

  const [settingsForm, setSettingsForm] = useState({
    name: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    session_start_time: '19:30:00',
    session_end_time: '21:00:00'
  })

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
      
      // Carregar perfis
      const profilesData = await getAllProfiles()
      setProfiles(profilesData)
      
      // Carregar configurações
      const settings = await getLodgeSettings()
      setLodgeSettings(settings)
      setSettingsForm({
        name: settings.name,
        latitude: settings.latitude,
        longitude: settings.longitude,
        radius_meters: settings.radius_meters,
        session_start_time: settings.session_start_time,
        session_end_time: settings.session_end_time
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar dados' })
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Criar usuário no Supabase Auth
      await signUp(
        memberForm.email,
        memberForm.password,
        memberForm.full_name,
        memberForm.cargo,
        memberForm.phone
      )

      setMessage({ type: 'success', text: 'Membro adicionado com sucesso!' })
      setShowAddMember(false)
      setMemberForm({
        full_name: '',
        cargo: '',
        phone: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active'
      })
      
      // Recarregar dados
      setTimeout(loadData, 1000) // Aguardar um pouco para o trigger criar o perfil
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao adicionar membro' })
    }
  }

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingMember) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: memberForm.full_name,
          cargo: memberForm.cargo,
          phone: memberForm.phone,
          role: memberForm.role,
          status: memberForm.status
        })
        .eq('id', editingMember.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Membro atualizado com sucesso!' })
      setEditingMember(null)
      setMemberForm({
        full_name: '',
        cargo: '',
        phone: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active'
      })
      loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar membro' })
    }
  }

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('lodge_settings')
        .update(settingsForm)
        .eq('id', lodgeSettings?.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' })
      loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar configurações' })
    }
  }

  const startEditMember = (member: Profile) => {
    setEditingMember(member)
    setMemberForm({
      full_name: member.full_name,
      cargo: member.cargo || '',
      phone: member.phone || '',
      email: '',
      password: '',
      role: member.role,
      status: member.status
    })
  }

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white">Carregando painel administrativo...</p>
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
                onClick={() => router.push('/')}
                className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Shield className="w-8 h-8 text-yellow-400" />
                <div>
                  <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
                  <p className="text-yellow-400 text-sm">A.R.L.S. Acílio Cândido Ventura nº 3569</p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-white font-medium">{user?.profile?.full_name}</p>
              <p className="text-yellow-400 text-sm">Administrador</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/10 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'members'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Membros</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'sessions'
                ? 'bg-yellow-400 text-black'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Sessões</span>
          </button>
        </div>

        {/* Conteúdo das tabs */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Header da seção */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Gerenciar Membros</h2>
              <button
                onClick={() => setShowAddMember(true)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 py-2 rounded-lg font-medium hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>Adicionar Membro</span>
              </button>
            </div>

            {/* Lista de membros */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-yellow-400/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Nome</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Cargo</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Telefone</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Papel</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-white/80">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-white">{profile.full_name}</td>
                        <td className="px-6 py-4 text-white/80">{profile.cargo || '-'}</td>
                        <td className="px-6 py-4 text-white/80">{profile.phone || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            profile.role === 'admin' 
                              ? 'bg-yellow-400/20 text-yellow-400' 
                              : 'bg-blue-400/20 text-blue-400'
                          }`}>
                            {profile.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            profile.status === 'active' 
                              ? 'bg-green-400/20 text-green-400' 
                              : 'bg-red-400/20 text-red-400'
                          }`}>
                            {profile.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => startEditMember(profile)}
                            className="text-yellow-400 hover:text-yellow-300 p-1"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal de adicionar membro */}
            {showAddMember && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-yellow-400/20">
                  <h3 className="text-xl font-bold text-white mb-4">Adicionar Novo Membro</h3>
                  
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={memberForm.full_name}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Cargo</label>
                      <input
                        type="text"
                        value={memberForm.cargo}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, cargo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Ex: Venerável Mestre, Secretário..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">E-mail</label>
                      <input
                        type="email"
                        required
                        value={memberForm.email}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Senha</label>
                      <input
                        type="password"
                        required
                        value={memberForm.password}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        minLength={6}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={memberForm.phone}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Papel</label>
                      <select
                        value={memberForm.role}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddMember(false)}
                        className="flex-1 bg-white/10 text-white py-2 px-4 rounded-lg hover:bg-white/20 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all"
                      >
                        Adicionar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal de editar membro */}
            {editingMember && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-yellow-400/20">
                  <h3 className="text-xl font-bold text-white mb-4">Editar Membro</h3>
                  
                  <form onSubmit={handleUpdateMember} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={memberForm.full_name}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Cargo</label>
                      <input
                        type="text"
                        value={memberForm.cargo}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, cargo: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={memberForm.phone}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Papel</label>
                      <select
                        value={memberForm.role}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
                      <select
                        value={memberForm.status}
                        onChange={(e) => setMemberForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingMember(null)}
                        className="flex-1 bg-white/10 text-white py-2 px-4 rounded-lg hover:bg-white/20 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all"
                      >
                        Salvar
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
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Nome da Loja</label>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={settingsForm.latitude}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={settingsForm.longitude}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Raio Permitido (metros)</label>
                  <input
                    type="number"
                    value={settingsForm.radius_meters}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, radius_meters: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Horário de Início</label>
                    <input
                      type="time"
                      value={settingsForm.session_start_time}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, session_start_time: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Horário de Fim</label>
                    <input
                      type="time"
                      value={settingsForm.session_end_time}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, session_end_time: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-lg font-medium hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>Salvar Configurações</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Gerenciar Sessões</h2>
              <button
                onClick={() => router.push('/admin/reports')}
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-500 hover:to-blue-700 transition-all flex items-center space-x-2"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Ver Relatórios</span>
              </button>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
              <p className="text-white/80 text-center py-8">
                Funcionalidade de gerenciamento de sessões em desenvolvimento.
                <br />
                Por enquanto, as sessões são criadas automaticamente quando alguém marca presença.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}