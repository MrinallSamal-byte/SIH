import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminLogin } from '../api/endpoints'
import type { AdminUser } from '../types'

const SESSION_KEY = 'aapdasetu_admin_session'

// @TODO BUILD: when a real backend exists this session is persisted via
// POST /api/admin/login -> { token, email, name } (server-side bcrypt compare).
// Optionally validate the token against the backend on load.
export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as AdminUser) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminLogin(email, password)
      localStorage.setItem(SESSION_KEY, JSON.stringify(data))
      setUser(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, error, isAuthed: !!user, login, logout }), [user, loading, error, login, logout])
  return value
}

export function useIsAdminAuthed(): boolean {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(SESSION_KEY))
  useEffect(() => {
    const onStorage = () => setAuthed(!!localStorage.getItem(SESSION_KEY))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return authed
}
