import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createReport } from '../../api/endpoints'
import { aiTriage } from '../../api/ai'
import PriorityBadge from '../../components/common/PriorityBadge'
import { Field, Input } from '../../components/common/Input'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { getCurrentPosition } from '../../lib/helpers'
import { useLocation } from '../../hooks/useLocation'
import type { IncidentType, Report, ReportInput } from '../../types'

const emergencyTypes: { type: IncidentType; label: string; icon: string }[] = [
  { type: 'other', label: 'General Emergency', icon: '🚨' },
  { type: 'flood', label: 'Flood / Water Rising', icon: '🌊' },
  { type: 'medical', label: 'Critical Medical', icon: '🚑' },
  { type: 'fire', label: 'Fire / Explosion', icon: '🔥' },
  { type: 'earthquake', label: 'Trapped / Collapse', icon: '🏚️' },
]

export default function SOS() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { coords, status: geoStatus } = useLocation()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedType, setSelectedType] = useState<IncidentType>('other')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [copied, setCopied] = useState(false)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // Clear phone error when user types
  useEffect(() => {
    if (phone.trim().length >= 10 && phoneError) {
      setPhoneError(null)
    }
  }, [phone, phoneError])

  const validatePhone = (raw: string): boolean => {
    const clean = raw.replace(/\D/g, '')
    return clean.length >= 10 && clean.length <= 15
  }

  const trigger = async () => {
    // 1. Mandatory Phone Number Validation
    if (!phone.trim()) {
      setPhoneError(t('sos.phoneRequiredError'))
      phoneInputRef.current?.focus()
      toast('Mobile number is required for emergency dispatch', 'error')
      return
    }

    if (!validatePhone(phone.trim())) {
      setPhoneError('Please enter a valid 10-digit mobile number.')
      phoneInputRef.current?.focus()
      toast('Invalid mobile number format', 'error')
      return
    }

    setPhoneError(null)
    setTriggering(true)

    try {
      const typeLabel = emergencyTypes.find((e) => e.type === selectedType)?.label || 'Emergency'
      const input: ReportInput = {
        type: selectedType,
        description: `1-Tap SOS distress trigger: ${typeLabel}`,
        isOneTapSos: true,
        reporterName: name.trim() || undefined,
        reporterPhone: phone.trim(),
      }

      try {
        if (coords) {
          input.location = { lat: coords.latitude, lng: coords.longitude }
        } else {
          const pos = await getCurrentPosition()
          input.location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }
      } catch {
        // Geolocation fallback
      }

      // Explainable AI urgency triage (FastAPI /ai/triage when connected)
      const triage = await aiTriage(input)
      const report = await createReport({ ...input, description: input.description })
      const finalReport = report.priorityLabel ? report : { ...report, priorityScore: triage.score, priorityLabel: triage.label }
      
      setResult(finalReport)

      // Save to localStorage for quick tracking
      try {
        localStorage.setItem('aapdasetu_last_sos', JSON.stringify(finalReport))
        const existingTracked = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
        if (!existingTracked.includes(finalReport.trackingId)) {
          localStorage.setItem('aapdasetu_tracked_reports', JSON.stringify([finalReport.trackingId, ...existingTracked]))
        }
      } catch {}

      toast(t('sos.sent'))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send SOS', 'error')
    } finally {
      setTriggering(false)
    }
  }

  const copyTrackingId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true)
      toast('Tracking ID copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-2xl flex-col items-center justify-center py-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
        <span className="h-2 w-2 animate-ping rounded-full bg-red-600" />
        High-Priority Distress Channel
      </div>

      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-4xl">
        {t('sos.title')}
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Instant zero-delay emergency broadcast to NDRF, SDRF, and nearby response units.
      </p>

      {/* GPS Status Indicator */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <svg className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        {coords ? (
          <span>GPS Locked: <strong>{coords.latitude.toFixed(4)}°N, {coords.longitude.toFixed(4)}°E</strong></span>
        ) : geoStatus === 'locating' ? (
          <span>Acquiring high-precision GPS...</span>
        ) : (
          <span>GPS Ready (Network Geolocation)</span>
        )}
      </div>

      {!result ? (
        <>
          {/* Emergency Category Chips */}
          <div className="mt-6 w-full max-w-md text-left">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Emergency Situation (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {emergencyTypes.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSelectedType(item.type)}
                  className={`flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs font-semibold transition ${
                    selectedType === item.type
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-sm dark:border-red-500 dark:bg-red-950/60 dark:text-red-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Contact Details Card */}
          <div className="mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Rescue Contact Details
              </span>
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">* Phone is required</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('sos.phone')}
                </label>
                <input
                  ref={phoneInputRef}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (phoneError) setPhoneError(null)
                  }}
                  placeholder={t('sos.phonePlaceholder')}
                  type="tel"
                  autoComplete="tel"
                  required
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition dark:bg-slate-800 dark:text-slate-100 ${
                    phoneError
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-200 dark:border-red-500 dark:bg-red-950/30 dark:ring-red-900'
                      : 'border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-slate-700'
                  }`}
                />
                {phoneError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {phoneError}
                  </p>
                )}
              </div>

              <Field label={t('sos.name')}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('sos.namePlaceholder')}
                  autoComplete="name"
                />
              </Field>
            </div>
          </div>

          {/* Big SOS Trigger Button */}
          <div className="mt-8 flex flex-col items-center">
            <button
              type="button"
              onClick={trigger}
              disabled={triggering}
              className="relative flex h-52 w-52 items-center justify-center rounded-full bg-red-600 text-2xl font-black text-white shadow-2xl ring-8 ring-red-200 transition-all duration-300 hover:scale-105 hover:bg-red-700 active:scale-95 disabled:opacity-75 sm:h-64 sm:w-64 sm:text-3xl dark:ring-red-950"
              aria-label="Send SOS Distress Alert"
            >
              {triggering ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                  <span className="text-sm font-bold tracking-widest uppercase">DISPATCHING…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-3xl sm:text-4xl">🚨</span>
                  <span className="mt-1 leading-tight">{t('sos.trigger')}</span>
                </div>
              )}
            </button>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              * Tap to alert response units immediately. Your location will be forwarded.
            </p>
          </div>
        </>
      ) : (
        /* Real-Life Distress Confirmation & Live Tracking CTA */
        <div className="mt-6 w-full max-w-lg space-y-5 rounded-2xl border border-red-200 bg-white p-6 text-left shadow-xl dark:border-red-900/50 dark:bg-slate-900">
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3.5 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg text-white">
              ✓
            </span>
            <div>
              <h2 className="text-sm font-bold">SOS Distress Signal Broadcasted!</h2>
              <p className="text-xs text-red-700 dark:text-red-400">
                Disaster control room & nearby rescue units have been notified with your phone and GPS location.
              </p>
            </div>
          </div>

          {/* Tracking ID & Priority */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Your Incident Tracking ID
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100">
                    {result.trackingId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyTrackingId(result.trackingId)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <PriorityBadge label={result.priorityLabel} />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <span>Urgency Score: <strong>{result.priorityScore}/100</strong></span>
              <span>Contact: <strong>{result.reporterPhone}</strong></span>
            </div>
          </div>

          {/* Direct CTA to Live Tracking */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate(`/track?id=${encodeURIComponent(result.trackingId)}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
            >
              <span>Track Live Response Status</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                setResult(null)
                setPhone('')
                setName('')
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Trigger Another SOS
            </button>
          </div>

          {/* Emergency Helpline Numbers */}
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="block text-center text-xs font-bold text-slate-500 dark:text-slate-400">
              Direct Emergency Helplines (Toll-Free)
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <a
                href="tel:112"
                className="rounded-lg bg-slate-100 p-2 text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <div className="text-base font-extrabold text-red-600">112</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">National SOS</div>
              </a>
              <a
                href="tel:108"
                className="rounded-lg bg-slate-100 p-2 text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <div className="text-base font-extrabold text-blue-600">108</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Ambulance</div>
              </a>
              <a
                href="tel:1070"
                className="rounded-lg bg-slate-100 p-2 text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <div className="text-base font-extrabold text-emerald-600">1070</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Disaster Control</div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
