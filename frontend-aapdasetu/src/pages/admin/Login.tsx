import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { Field, Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../lib/i18n'

export default function AdminLogin() {
  const { t } = useLanguage()
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  // ponytail: prefilled demo credentials matching backend seed defaults —
  // remove before real deployment; real password comes from ADMIN_PASSWORD env
  const [email, setEmail] = useState('admin@aapdasetu.org')
  const [password, setPassword] = useState('Admin@123')

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 font-bold text-white text-xs font-mono">
              ICS
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('adminNav.title')}
              </span>
              <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-white/[0.1]">
                {t('adminLogin.badgeOfficial')}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('adminLogin.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('adminLogin.subtitle')}
          </p>

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
