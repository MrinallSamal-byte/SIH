import { useCallback, useEffect, useMemo, useState } from 'react'
import { volunteerLogin } from '../api/endpoints'
import type { VolunteerUser } from '../types'

export const VOLUNTEER_AUTH_KEY = 'aapdasetu_volunteer_auth'
export const VOLUNTEER_ID_KEY = 'aapdasetu_volunteer_session'

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
      setError(err instanceof Error ? err.message : 'Volunteer login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(VOLUNTEER_AUTH_KEY)
    localStorage.removeItem(VOLUNTEER_ID_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, isAuthed: !!user, login, logout }),
    [user, loading, error, login, logout]
  )
  return value
}

export function useIsVolunteerAuthed(): boolean {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(VOLUNTEER_AUTH_KEY))
  useEffect(() => {
    const onStorage = () => setAuthed(!!localStorage.getItem(VOLUNTEER_AUTH_KEY))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return authed
}
