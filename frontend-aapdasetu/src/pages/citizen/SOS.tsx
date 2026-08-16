import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createReport } from '../../api/endpoints'
import { aiTriage } from '../../api/ai'
import PriorityBadge from '../../components/common/PriorityBadge'
import { Field, Input } from '../../components/common/Input'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { getCurrentPosition } from '../../lib/helpers'
import { useLocation } from '../../hooks/useLocation'
import type { Report, ReportInput } from '../../types'

export default function SOS() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { coords } = useLocation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [triggering, setTriggering] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trigger = async () => {
    setTriggering(true)
    setError(null)
    try {
      const input: ReportInput = {
        type: 'other',
        description: '1-Tap SOS emergency alert',
        isOneTapSos: true,
        reporterName: name.trim() || undefined,
        reporterPhone: phone.trim() || undefined,
      }

      try {
        if (coords) {
          input.location = { lat: coords.latitude, lng: coords.longitude }
        } else {
          const pos = await getCurrentPosition()
          input.location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }
      } catch {
        // Geolocation unavailable — report still goes through with no coordinates
      }

      // Explainable AI urgency triage (FastAPI /ai/triage when connected)
      const triage = await aiTriage(input)
      const report = await createReport({ ...input, description: input.description })
      setResult({ ...report, priorityScore: triage.score, priorityLabel: triage.label })
      toast(t('sos.sent'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SOS')
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] w-full flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">{t('sos.title')}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Zero-friction distress trigger. Your GPS coordinates are captured automatically.
      </p>

      <button
        onClick={trigger}
        disabled={triggering}
        className="mt-10 flex h-56 w-56 items-center justify-center rounded-full bg-red-600 text-2xl font-black text-white shadow-xl ring-8 ring-red-200 transition hover:scale-105 hover:bg-red-700 active:scale-95 disabled:opacity-60 sm:h-72 sm:w-72 sm:text-3xl"
      >
        {triggering ? 'SENDING…' : t('sos.trigger')}
      </button>

      <div className="mt-10 grid w-full max-w-sm gap-3 text-left">
        <Field label={t('sos.name')}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('sos.namePlaceholder')}
            autoComplete="name"
          />
        </Field>
        <Field label={t('sos.phone')}>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('sos.phonePlaceholder')}
            type="tel"
            autoComplete="tel"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-6 w-full max-w-md rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>
      )}

      {result && (
        <div className="mt-8 w-full max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-left dark:border-slate-800 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Tracking ID</div>
              <div className="font-mono text-lg font-bold dark:text-slate-100">{result.trackingId}</div>
            </div>
            <PriorityBadge label={result.priorityLabel} />
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Priority score: <strong>{result.priorityScore}/100</strong>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Save your tracking ID to monitor the incident:{' '}
            <Link to="/track" className="text-blue-600 underline">
              track it
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
