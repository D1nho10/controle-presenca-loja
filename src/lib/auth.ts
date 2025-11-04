import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from './supabase'

export interface AuthUser extends User {
  profile?: Profile
}

// Fazer login
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

// Fazer logout
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Registrar novo usuário (apenas admins podem fazer isso)
export async function signUp(email: string, password: string, fullName: string, cargo?: string, phone?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        cargo,
        phone,
      }
    }
  })
  
  if (error) throw error
  return data
}

// Obter usuário atual
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) return null
  
  // Buscar perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return {
    ...user,
    profile: profile || undefined
  }
}

// Verificar se usuário é admin
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.profile?.role === 'admin'
}

// Atualizar perfil do usuário
export async function updateProfile(updates: Partial<Profile>) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Usuário não autenticado')
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Obter todos os perfis (apenas para admins)
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  
  if (error) throw error
  return data || []
}

// Criar novo perfil (apenas para admins)
export async function createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Resetar senha
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  
  if (error) throw error
}