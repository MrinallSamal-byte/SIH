import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { Field, Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'

export default function AdminLogin() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/admin')
    } catch {
      // error surfaced via useAuth
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-950 p-8">
        <h1 className="text-xl font-bold">AapdaSetu Command Center</h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Admin sign-in · POST /api/admin/login (server-side bcrypt compare)
        </p>
        <div className="mt-5 space-y-4">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error && <div className="rounded bg-red-50 p-2 text-xs text-red-600">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading || !email || !password}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>
    </div>
  )
}
