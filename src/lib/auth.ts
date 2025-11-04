import { supabase } from './supabase'
import type { Profile } from './supabase'

export interface AuthUser extends Profile {
  email?: string
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, fullName: string, cargo?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        cargo: cargo || '',
        role: 'user'
      }
    }
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    ...profile,
    email: user.email
  }
}

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

export async function createUser(email: string, password: string, profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) {
  // Apenas admins podem criar usuários
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Apenas administradores podem criar usuários')
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      full_name: profile.full_name,
      cargo: profile.cargo,
      role: profile.role
    }
  })

  if (error) throw error
  return data
}

export async function updateUser(userId: string, updates: Partial<Profile>) {
  // Apenas admins podem atualizar usuários
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Apenas administradores podem atualizar usuários')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUser(userId: string) {
  // Apenas admins podem deletar usuários
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Apenas administradores podem deletar usuários')
  }

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw error
}

export async function getAllUsers() {
  // Apenas admins podem ver todos os usuários
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Apenas administradores podem ver todos os usuários')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}