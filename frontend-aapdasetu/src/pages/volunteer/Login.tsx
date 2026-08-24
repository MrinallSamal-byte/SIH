import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { Field, Input } from '../../components/common/Input'
import { useVolunteerAuth } from '../../hooks/useVolunteerAuth'
import { useLanguage } from '../../lib/i18n'

export default function VolunteerLogin() {
  const { t } = useLanguage()
  const { login, loading, error } = useVolunteerAuth()
  const navigate = useNavigate()
  // ponytail: prefilled demo credentials (seeded volunteer #1 + dev access code) —
  // remove before real deployment; code comes from VOLUNTEER_ACCESS_CODE env
  const [phone, setPhone] = useState('9876510001')
  const [accessCode, setAccessCode] = useState('aapdasetu-dev-volunteer-code')
  // ponytail: backend auth is phone + shared access code; require 10-15 digits
  const phoneDigits = phone.replace(/\D/g, '')
  const canSubmit = phoneDigits.length >= 10 && phoneDigits.length <= 15 && accessCode.trim().length > 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    try {
      await login(phoneDigits, accessCode)
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
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white text-sm">
              V
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('app.name')}
              </span>
              <span className="ml-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                {t('volLogin.badgeVolunteer')}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('volLogin.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Sign in with your registered phone number and shared access code.
          </p>

          <div className="mt-6 space-y-4">
            <Field label="Phone Number">
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                autoComplete="tel"
                required
              />
            </Field>

            <Field label="Access Code">
              <Input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
              disabled={loading || !canSubmit}
            >
              {loading ? t('volLogin.authenticating') : t('volLogin.signIn')}
            </Button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
            <Link
              to="/"
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t('volLogin.returnHome')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
