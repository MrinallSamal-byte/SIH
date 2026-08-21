import { useState } from 'react'
import {
  Settings as SettingsIcon,
  Smartphone,
  MessageSquare,
  Cpu,
  Save,
  RotateCcw,
  Sliders,
} from 'lucide-react'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { resetMockDatabase } from '../../api/endpoints'
import { useLanguage } from '../../lib/i18n'

interface ServerCreds {
  twilioSid: string
  twilioAuthToken: string
  twilioSenderNumber: string
  whatsappToken: string
  whatsappPhoneNumberId: string
  aiVisionEndpoint: string
  aiTriageEndpoint: string
  autoEscalateMinutes: string
}

const STORAGE_KEY = 'aapdasetu_server_creds_placeholder'
const empty: ServerCreds = {
  twilioSid: '',
  twilioAuthToken: '',
  twilioSenderNumber: '+1234567890',
  whatsappToken: '',
  whatsappPhoneNumberId: '',
  aiVisionEndpoint: 'http://localhost:8000/api/ai/damage-assessment',
  aiTriageEndpoint: 'http://localhost:8000/api/ai/pfa-triage',
  autoEscalateMinutes: '15',
}

export default function Settings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [creds, setCreds] = useState<ServerCreds>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...empty, ...(JSON.parse(raw) as ServerCreds) } : empty
    } catch {
      return empty
    }
  })

  const [saving, setSaving] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(creds))
      toast(t('st.saveSuccess'), 'success')
    } catch {
      toast(t('st.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof ServerCreds) => (value: string) =>
    setCreds((prev) => ({ ...prev, [key]: value }))

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('st.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('st.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" className="shadow-sm cursor-pointer flex items-center gap-1.5">
            <Save className="h-4 w-4" />
            <span>{saving ? t('st.saving') : t('st.saveChanges')}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* SMS Gateway Card */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <span>{t('st.smsGateway')}</span>
          </div>

          <Field label={t('st.accountSid')}>
            <Input
              value={creds.twilioSid}
              onChange={(e) => set('twilioSid')(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </Field>

          <Field label={t('st.authToken')}>
            <Input
              type="password"
              value={creds.twilioAuthToken}
              onChange={(e) => set('twilioAuthToken')(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="font-mono text-xs"
            />
          </Field>

          <Field label={t('st.senderNumber')}>
            <Input
              value={creds.twilioSenderNumber}
              onChange={(e) => set('twilioSenderNumber')(e.target.value)}
              placeholder="+1234567890 or AAPDASETU"
              className="font-mono text-xs"
            />
          </Field>
        </div>

        {/* WhatsApp Gateway Card */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <span>{t('st.whatsappGateway')}</span>
          </div>

          <Field label={t('st.cloudApiToken')}>
            <Input
              type="password"
              value={creds.whatsappToken}
              onChange={(e) => set('whatsappToken')(e.target.value)}
              placeholder="EAABxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </Field>

          <Field label={t('st.phoneNumberId')}>
            <Input
              value={creds.whatsappPhoneNumberId}
              onChange={(e) => set('whatsappPhoneNumberId')(e.target.value)}
              placeholder="100000000000000"
              className="font-mono text-xs"
            />
          </Field>

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {t('st.webhookCallbackUrl')} <code className="text-slate-800 dark:text-slate-200">https://api.aapdasetu.org/webhook/whatsapp</code>
          </div>
        </div>

        {/* AI Engine Hooks */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Cpu className="h-4 w-4 text-purple-600" />
            <span>{t('st.aiEndpoints')}</span>
          </div>

          <Field label={t('st.visionEndpointLabel')}>
            <Input
              value={creds.aiVisionEndpoint}
              onChange={(e) => set('aiVisionEndpoint')(e.target.value)}
              placeholder="http://localhost:8000/api/ai/damage-assessment"
              className="font-mono text-xs"
            />
          </Field>

          <Field label={t('st.triageModelLabel')}>
            <Input
              value={creds.aiTriageEndpoint}
              onChange={(e) => set('aiTriageEndpoint')(e.target.value)}
              placeholder="http://localhost:8000/api/ai/pfa-triage"
              className="font-mono text-xs"
            />
          </Field>
        </div>

        {/* Incident Command SOP Parameters */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Sliders className="h-4 w-4 text-amber-600" />
            <span>{t('st.thresholds')}</span>
          </div>

          <Field label={t('st.autoEscalateLabel')}>
            <Input
              type="number"
              value={creds.autoEscalateMinutes}
              onChange={(e) => set('autoEscalateMinutes')(e.target.value)}
              placeholder="15"
              className="font-mono text-xs"
            />
          </Field>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            {t('st.escalationWarning').replace('{n}', creds.autoEscalateMinutes || '15')}
          </div>
        </div>
      </div>

      {/* Database Diagnostic & Environment Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-slate-500" />
            <span>{t('st.resetSection')}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('st.resetDesc')}
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (window.confirm(t('st.resetConfirm'))) {
              await resetMockDatabase()
              toast(t('st.resetSuccess'), 'success')
            }
          }}
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0 cursor-pointer"
        >
          {t('st.resetButton')}
        </button>
      </div>
    </form>
  )
}
