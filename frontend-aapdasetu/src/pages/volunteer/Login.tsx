import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { Field, Input } from '../../components/common/Input'
import { useVolunteerAuth, useIsVolunteerAuthed } from '../../hooks/useVolunteerAuth'
import { useLanguage } from '../../lib/i18n'

export default function VolunteerLogin() {
  const { t } = useLanguage()
  const { login, loading, error } = useVolunteerAuth()
  const isAuthed = useIsVolunteerAuthed()
  const navigate = useNavigate()
  // Field test identity is filled on demand (never printed) so the sign-in
  // form reads like a real responder console while evaluation stays 1-click.
  const [phone, setPhone] = useState('')
  const [accessCode, setAccessCode] = useState('')
  // ponytail: backend auth is phone + shared access code; require 10-15 digits
  const phoneDigits = phone.replace(/\D/g, '')
  const canSubmit = phoneDigits.length >= 10 && phoneDigits.length <= 15 && accessCode.trim().length > 0

  useEffect(() => {
    if (isAuthed) {
      navigate('/volunteer', { replace: true })
    }
  }, [isAuthed, navigate])

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-[#121212]">
      <div className="w-full max-w-sm">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 font-bold text-white text-xs font-mono dark:bg-zinc-100 dark:text-zinc-900">
              V
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-slate-100">
                {t('app.name')}
              </span>
              <span className="ml-1.5 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 mono">
                {t('volLogin.badgeVolunteer')}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-slate-100">
            {t('volLogin.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('volLogin.subtitle')}
          </p>

          <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50 p-2.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span>{t('volLogin.testAccountHint', 'Authorised responders only. Credentials are issued by your district control room.')}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPhone('9876543210')
                setAccessCode('aapdasetu-dev-volunteer-code')
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-[11px] font-bold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
            >
              {t('volLogin.useTestAccount', 'Use field test identity')}
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <Field label={t('volLogin.phoneLabel')}>
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('volLogin.phonePlaceholder')}
                autoComplete="tel"
                required
              />
            </Field>

            <Field label={t('volLogin.accessCodeLabel')}>
              <Input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={t('volLogin.accessCodePlaceholder')}
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
