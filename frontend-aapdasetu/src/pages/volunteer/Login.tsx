import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { Field, Input } from '../../components/common/Input'
import { useVolunteerAuth } from '../../hooks/useVolunteerAuth'

export default function VolunteerLogin() {
  const { login, loading, error } = useVolunteerAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [accessCode, setAccessCode] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login(phone, accessCode)
      navigate('/volunteer')
    } catch {
      // error surfaced via useVolunteerAuth
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white text-sm">
              V
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                AapdaSetu
              </span>
              <span className="ml-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Volunteer Force
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Volunteer Login
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-white leading-relaxed">
            Use your registered phone number and coordinator-issued access code to access your field response tasks and duty dashboard.
          </p>

          <div className="mt-6 space-y-4">
            <Field label="Phone Number">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                autoComplete="tel"
                required
              />
            </Field>

            <Field label="Access Code">
              <Input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Code from your coordinator"
                autoComplete="one-time-code"
                required
              />
            </Field>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-bold"
              disabled={loading || !phone.trim() || !accessCode.trim()}
            >
              {loading ? 'Authenticating…' : 'Enter Volunteer Portal'}
            </Button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
            <Link
              to="/"
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-white"
            >
              ← Return to Citizen Homepage
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
