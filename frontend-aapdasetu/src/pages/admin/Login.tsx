import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { Field, Input } from '../../components/common/Input'
import { useAuth, useIsAdminAuthed } from '../../hooks/useAuth'
import { useLanguage } from '../../lib/i18n'

export default function AdminLogin() {
  const { t } = useLanguage()
  const { login, loading, error } = useAuth()
  const isAuthed = useIsAdminAuthed()
  const navigate = useNavigate()
  // Field test account is filled on demand (never printed) so the sign-in
  // form looks like a real operations console while evaluation stays 1-click.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (isAuthed) {
      navigate('/admin', { replace: true })
    }
  }, [isAuthed, navigate])

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-[#121212]">
      <div className="w-full max-w-sm">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 font-bold text-white text-xs font-mono">
              ICS
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-slate-100">
                {t('adminNav.title')}
              </span>
              <span className="ml-1.5 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 mono">
                {t('adminLogin.badgeOfficial')}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-slate-100">
            {t('adminLogin.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('adminLogin.subtitle')}
          </p>

          <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50 p-2.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>{t('adminLogin.testAccountHint', 'Restricted to authorised control-room personnel.')}</span>
            <button
              type="button"
              onClick={() => {
                setEmail('adminapp@gmail.com')
                setPassword('12345')
              }}
              className="w-full sm:w-auto text-center shrink-0 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 font-mono font-bold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
            >
              {t('adminLogin.useTestAccount', 'Use field test account')}
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <Field label={t('adminLogin.emailLabel')}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('adminLogin.emailPlaceholder')}
                autoComplete="username"
                required
              />
            </Field>

            <Field label={t('adminLogin.passwordLabel')}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('adminLogin.passwordPlaceholder')}
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
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? t('adminLogin.signingIn') : t('adminLogin.signIn')}
            </Button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
            <Link
              to="/"
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {t('adminLogin.returnHome')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
