import { useCallback, useEffect, useMemo, useState } from 'react'
import { ADMIN_SESSION_KEY, clearSnapshots } from '../api/client'
import { adminLogin } from '../api/endpoints'
import type { AdminUser } from '../types'

const SESSION_KEY = ADMIN_SESSION_KEY

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

// Decodes the JWT payload to check expiry client-side. An expired token used
// to keep `isAuthed` true, every admin call 401'd, and the mock fallback then
// served a plausible FAKE command dashboard — operators must be logged out.
function isTokenExpired(token: string | undefined): boolean {
  if (!token) return true
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return false // not a JWT — treat as opaque session value
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as { exp?: number }
    if (typeof payload.exp !== 'number') return false
    return Date.now() / 1000 >= payload.exp
  } catch {
    return false
  }
}

function readStoredAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AdminUser
    if (isTokenExpired(session.token)) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(() => readStoredAdmin())
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
    clearSnapshots()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, error, isAuthed: !!user, login, logout }), [user, loading, error, login, logout])
  return value
}

export function useIsAdminAuthed(): boolean {
  const [authed, setAuthed] = useState(() => readStoredAdmin() !== null)
  useEffect(() => {
    const onStorage = () => setAuthed(readStoredAdmin() !== null)
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return authed
}
