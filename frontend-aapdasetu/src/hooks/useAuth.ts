import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminLogin } from '../api/endpoints'
import type { AdminUser } from '../types'

const SESSION_KEY = 'aapdasetu_admin_session'

// Fallback shown only when a thrown value is not an Error (raw backend messages
// always pass through untouched). Read outside React — mirrors ErrorBoundary's
// localStorage language pattern (src/lib/i18n.tsx keeps 'aapdasetu_lang' in sync).
const LOGIN_FAILED_STRINGS = {
  en: 'Login failed',
  hi: 'लॉगिन विफल',
  bn: 'লগইন ব্যর্থ',
  or: 'ଲଗଇନ୍ ବିଫଳ',
} as const

function readStoredLanguage(): keyof typeof LOGIN_FAILED_STRINGS {
  try {
    const stored = localStorage.getItem('aapdasetu_lang')
    if (stored === 'hi' || stored === 'bn' || stored === 'or') return stored
  } catch {
    // Storage unavailable — fall back to English
  }
  return 'en'
}

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
      setError(err instanceof Error ? err.message : LOGIN_FAILED_STRINGS[readStoredLanguage()])
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
