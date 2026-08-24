import { useCallback, useEffect, useMemo, useState } from 'react'
import { VOLUNTEER_AUTH_KEY, clearSnapshots } from '../api/client'
import { volunteerLogin } from '../api/endpoints'
import type { VolunteerUser } from '../types'

export { VOLUNTEER_AUTH_KEY }
export const VOLUNTEER_ID_KEY = 'aapdasetu_volunteer_session'

// Fallback shown only when a thrown value is not an Error (raw backend messages
// always pass through untouched). Read outside React — mirrors ErrorBoundary's
// localStorage language pattern (src/lib/i18n.tsx keeps 'aapdasetu_lang' in sync).
const LOGIN_FAILED_STRINGS = {
  en: 'Volunteer login failed',
  hi: 'स्वयंसेवक लॉगिन विफल',
  bn: 'স্বেচ্ছাসেবী লগইন ব্যর্থ',
  or: 'ସ୍ୱେଚ୍ଛାସେବୀ ଲଗଇନ୍ ବିଫଳ',
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

export function useVolunteerAuth() {
  const [user, setUser] = useState<VolunteerUser | null>(() => {
    try {
      const raw = localStorage.getItem(VOLUNTEER_AUTH_KEY)
      return raw ? (JSON.parse(raw) as VolunteerUser) : null
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
      const data = await volunteerLogin(email, password)
      localStorage.setItem(VOLUNTEER_AUTH_KEY, JSON.stringify(data))
      localStorage.setItem(VOLUNTEER_ID_KEY, data.id)
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
    localStorage.removeItem(VOLUNTEER_AUTH_KEY)
    localStorage.removeItem(VOLUNTEER_ID_KEY)
    clearSnapshots()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, isAuthed: !!user, login, logout }),
    [user, loading, error, login, logout]
  )
  return value
}

export function useIsVolunteerAuthed(): boolean {
  const [authed, setAuthed] = useState(() => {
    try {
      return !!localStorage.getItem(VOLUNTEER_AUTH_KEY)
    } catch {
      return false
    }
  })
  useEffect(() => {
    const onStorage = () => setAuthed(!!localStorage.getItem(VOLUNTEER_AUTH_KEY))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return authed
}
