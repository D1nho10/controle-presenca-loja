'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { getCurrentUser, type AuthUser } from '@/lib/auth'

export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const user = useUser()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const getUser = async () => {
      if (user) {
        const currentUser = await getCurrentUser()
        setAuthUser(currentUser)
      } else {
        setAuthUser(null)
      }
      setLoading(false)
    }

    getUser()
  }, [user])

  return { user: authUser, loading }
}