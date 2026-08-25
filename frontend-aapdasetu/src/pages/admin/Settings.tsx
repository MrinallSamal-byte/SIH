import { useEffect, useState } from 'react'
import {
  Settings as SettingsIcon,
  Smartphone,
  Cpu,
  CheckCircle2,
  XCircle,
  Radio,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { getSystemStatus, type SystemStatus } from '../../api/endpoints'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'

/**
 * Read-only system status. Integration credentials (Twilio, WhatsApp Cloud API,
 * OpenRouter) are configured via backend environment variables — never through
 * this page. This view reports the truth about what the server is running with.
 */

function StatusRow({
  label,
  configured,
  detail,
}: {
  label: string
  configured: boolean
  detail?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
        {detail && <div className="text-[11px] text-slate-500 dark:text-slate-400 mono truncate">{detail}</div>}
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
          configured
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/50'
            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        }`}
      >
        {configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {configured ? 'Active' : 'Not configured'}
      </span>
    </div>
  )
}

export default function Settings() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getSystemStatus()
      .then(setStatus)
      .catch(() => {
        setStatus(null)
        toast(t('st.loadFailed', 'Could not load system status'), 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6 max-w-4xl">
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

        <Button variant="outline" onClick={load} disabled={loading} className="cursor-pointer flex items-center gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('common.refresh', 'Refresh')}</span>
        </Button>
      </div>

      {loading && !status ? (
        <Loader />
      ) : !status ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          {t('st.unavailable', 'System status is unavailable — the backend may be unreachable or your session has expired.')}
        </div>
      ) : (
        <>
          {/* Broadcast channels */}
          <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span>{t('st.broadcastChannels', 'Broadcast channels')}</span>
            </div>
            <StatusRow
              label={t('st.smsGateway')}
              configured={status.sms.configured}
              detail={status.sms.provider}
            />
            <StatusRow
              label={t('st.whatsappGateway', 'WhatsApp Cloud API')}
              configured={status.whatsapp.configured}
              detail={status.whatsapp.provider}
            />
            <p className="pt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t(
                'st.credsNote',
                'Provider credentials are set as backend environment variables (TWILIO_*, WHATSAPP_*). Without them, broadcasts still persist to the web channel.',
              )}
            </p>
          </div>

          {/* AI engine */}
          <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
              <Cpu className="h-4 w-4 text-purple-600" />
              <span>{t('st.aiEndpoints')}</span>
            </div>
            <StatusRow
              label={t('st.pfaLlm', 'PFA chatbot LLM (OpenRouter)')}
              configured={status.ai.pfaLlmConfigured}
            />
            <StatusRow
              label={t('st.damageMl', 'Damage assessment ML service')}
              configured={status.ai.damageMlConfigured}
              detail={status.ai.damageMlBaseUrl}
            />
          </div>

          {/* Runtime */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
                <Radio className="h-4 w-4 text-indigo-600" />
                <span>{t('st.realtime', 'Realtime transport')}</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                WebSocket endpoint: <span className="mono font-semibold">{status.realtimePath}</span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-3 dark:border-slate-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>{t('st.rateLimits', 'Rate limits')}</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex justify-between">
                  <span>{t('st.rlPublic', 'Public API')}</span>
                  <span className="mono font-semibold">{status.rateLimits.publicPerMinute}/min</span>
                </li>
                <li className="flex justify-between">
                  <span>{t('st.rlAdmin', 'Admin API')}</span>
                  <span className="mono font-semibold">{status.rateLimits.adminPer15Min}/15min</span>
                </li>
                <li className="flex justify-between">
                  <span>{t('st.rlUploads', 'Media uploads')}</span>
                  <span className="mono font-semibold">{status.rateLimits.uploadsPerHour}/hr</span>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
