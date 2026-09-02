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
  // Prefilled demo credentials for instant 1-click evaluation & field testing
  const [email, setEmail] = useState('adminapp@gmail.com')
  const [password, setPassword] = useState('12345')

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
          className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]"
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

          <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50 p-2.5 text-[11px] font-mono text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 flex items-center justify-between">
            <span>Demo: <strong className="text-zinc-900 dark:text-zinc-200">adminapp@gmail.com</strong></span>
            <span>Pass: <strong className="text-zinc-900 dark:text-zinc-200">12345</strong></span>
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
