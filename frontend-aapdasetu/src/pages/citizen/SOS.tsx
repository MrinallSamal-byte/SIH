import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createReport } from '../../api/endpoints'
import { aiTriage } from '../../api/ai'
import PriorityBadge from '../../components/common/PriorityBadge'
import { Field, Input } from '../../components/common/Input'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { getCurrentPosition, generateEmergencySms } from '../../lib/helpers'
import { useLocation } from '../../hooks/useLocation'
import type { IncidentType, Report, ReportInput } from '../../types'

const emergencyTypes: { type: IncidentType; label: string }[] = [
  { type: 'other', label: 'General Emergency' },
  { type: 'flood', label: 'Flood / Water Rising' },
  { type: 'medical', label: 'Critical Medical' },
  { type: 'fire', label: 'Fire / Explosion' },
  { type: 'earthquake', label: 'Trapped / Collapse' },
]

export default function SOS() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { coords, status: geoStatus, accuracy, refresh: refreshLocation } = useLocation()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [landmark, setLandmark] = useState('')
  const [selectedType, setSelectedType] = useState<IncidentType>('other')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [copied, setCopied] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // Clear phone error when user types
  useEffect(() => {
    if (phone.trim().length >= 10 && phoneError) {
      setPhoneError(null)
    }
  }, [phone, phoneError])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      // Check for pending offline SOS
      try {
        const pending = localStorage.getItem('aapdasetu_pending_sos')
        if (pending) {
          const parsed = JSON.parse(pending) as ReportInput
          createReport(parsed).then(() => {
            localStorage.removeItem('aapdasetu_pending_sos')
            toast('Pending offline SOS synced successfully!', 'success')
          }).catch(() => { })
        }
      } catch { }
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])





  const validatePhone = (raw: string): boolean => {
    const clean = raw.replace(/\D/g, '')
    return clean.length >= 10 && clean.length <= 15
  }

  const trigger = async () => {
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

      // Resilient GPS coordinates retrieval with fallback
      let lat = coords?.latitude
      let lng = coords?.longitude

      if (lat === undefined || lng === undefined) {
        try {
          const pos = await getCurrentPosition(false, 3500)
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch {
          // Fallback regional center (Kolkata/Disaster Center) if GPS is blocked in indoor/basement
          lat = 22.5726
          lng = 88.3639
        }
      }

      const input: ReportInput = {
        type: selectedType,
        description: `1-Tap SOS distress trigger: ${typeLabel}`,
        isOneTapSos: true,
        reporterName: name.trim() || undefined,
        reporterPhone: phone.trim(),
        location: { lat, lng },
        landmark: landmark.trim() || undefined,
      }

      // Offline handling
      if (!navigator.onLine) {
        localStorage.setItem('aapdasetu_pending_sos', JSON.stringify(input))
        toast('Offline: SOS queued! Will dispatch as soon as network reconnects.', 'error')
      }

      // AI urgency triage
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
      } catch { }

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

  const emergencySmsLink = generateEmergencySms({
    lat: coords?.latitude,
    lng: coords?.longitude,
    name: name.trim() || undefined,
    type: selectedType,
    phone: phone.trim() || undefined,
  })

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-2xl flex-col items-center justify-center py-4 sm:py-6 text-center">
      {/* Distress Channel Header */}
      <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 shadow-xs">
        <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
        Priority Emergency Channel
      </div>

      <h1 className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
        {t('sos.title')}
      </h1>
      <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-600 dark:text-slate-400">
        Direct satellite distress broadcast to NDRF, SDRF, Police, and local search & rescue teams.
      </p>

      {/* GPS Status Indicator & Accuracy */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          {coords ? (
            <span>
              GPS Locked: <strong className="font-mono text-slate-900 dark:text-slate-100">{coords.latitude.toFixed(4)}°N, {coords.longitude.toFixed(4)}°E</strong>
              {accuracy !== null && ` (±${Math.round(accuracy)}m)`}
            </span>
          ) : geoStatus === 'locating' ? (
            <span>Acquiring satellite GPS lock…</span>
          ) : (
            <span>GPS: Regional Center Fallback Active</span>
          )}
        </div>
        <button
          type="button"
          onClick={refreshLocation}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          🔄 Refresh GPS
        </button>
      </div>

      {isOffline && (
        <div className="mt-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 shadow-xs">
          ⚠️ Cellular Data Offline — Submissions will auto-queue, or use SMS Fallback below.
        </div>
      )}

      {!result ? (
        <>
          {/* Emergency Category Tiles (Full labels, no truncation) */}
          <div className="mt-5 w-full max-w-lg text-left">
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              1. Select Emergency Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {emergencyTypes.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setSelectedType(item.type)}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-bold transition-all ${selectedType === item.type
                      ? 'border-red-600 bg-red-50 text-red-900 shadow-sm ring-2 ring-red-200 dark:border-red-500 dark:bg-red-950/70 dark:text-red-200 dark:ring-red-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                >
                  <span className="leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rescue Details Card */}
          <div className="mt-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                2. Contact & Location Details
              </span>
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400">* Mobile required for rescue call</span>
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium outline-none transition dark:bg-slate-800 dark:text-slate-100 ${phoneError
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-200 dark:border-red-500 dark:bg-red-950/30 dark:ring-red-900'
                      : 'border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-slate-700'
                    }`}
                />
                {phoneError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                    <span>⚠️</span>
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('sos.name')}>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('sos.namePlaceholder')}
                    autoComplete="name"
                  />
                </Field>

                <Field label="Floor / Landmark (Optional)">
                  <Input
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. 2nd Floor, Room 204"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Simple 2D Emergency SOS Button */}
          <div className="mt-8 mb-4 flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={trigger}
              disabled={triggering}
              aria-label="Press for Emergency Satellite SOS Dispatch"
              className="
      relative flex h-44 w-44 sm:h-48 sm:w-48
      flex-col items-center justify-center
      rounded-full
      border-4 border-red-100
      bg-red-600
      text-white
      shadow-[0_8px_24px_rgba(220,38,38,0.28)]
      transition-all duration-150
      hover:bg-red-700
      hover:shadow-[0_10px_30px_rgba(220,38,38,0.38)]
      active:scale-95
      disabled:cursor-not-allowed
      disabled:opacity-80
      select-none
    "
            >
              {/* Subtle pulse ring */}
              {!triggering && (
                <span
                  className="
          absolute inset-[-8px]
          rounded-full
          border-2 border-red-300/60
          animate-pulse
          pointer-events-none
        "
                />
              )}

              {triggering ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="h-8 w-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Dispatching…
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center px-5">
                  <span className="mb-2 text-2xl">🚨</span>

                  <span className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight">
                    Press for
                    <br />
                    Emergency
                  </span>

                  <span className="mt-2 text-[9px] font-bold uppercase tracking-widest text-red-100">
                    1-Tap Dispatch
                  </span>
                </div>
              )}
            </button>

            <p className="mt-5 max-w-md text-xs font-medium text-slate-500 dark:text-slate-400">
              * Tap to alert response units immediately. Your location and contacts will be forwarded.
            </p>
          </div>

          {/* Offline Fallback SMS Option */}
          <div className="mt-4 w-full max-w-lg space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Offline Fallback Options
            </span>
            <a
              href={emergencySmsLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300 shadow-xs"
            >
              <span>💬</span>
              <span>1-Tap Emergency SMS (112 Offline Fallback)</span>
            </a>
          </div>
        </>
      ) : (
        /* Distress Confirmation & Live Tracking CTA */
        <div className="mt-6 w-full max-w-lg space-y-5 rounded-2xl border border-red-200 bg-white p-6 text-left shadow-xs dark:border-red-900/50 dark:bg-slate-900">
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3.5 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            <span className="text-lg font-bold">
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
                  <span className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-blue-700"
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
                setLandmark('')
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
                <div className="text-base font-bold text-red-600">112</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">National SOS</div>
              </a>
              <a
                href="tel:108"
                className="rounded-lg bg-slate-100 p-2 text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <div className="text-base font-bold text-blue-600">108</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Ambulance</div>
              </a>
              <a
                href="tel:1070"
                className="rounded-lg bg-slate-100 p-2 text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <div className="text-base font-bold text-emerald-600">1070</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Disaster Control</div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

