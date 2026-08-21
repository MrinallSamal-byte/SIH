import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Siren,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Phone,
  ArrowRight,
  MessageSquare,
  Edit3,
} from 'lucide-react'
import { createReport } from '../../api/endpoints'
import { aiTriage } from '../../api/ai'
import PriorityBadge from '../../components/common/PriorityBadge'
import { Field, Input } from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import LandmarkPicker from '../../components/map/LandmarkPicker'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { getHighPrecisionPosition, generateEmergencySms } from '../../lib/helpers'
import { useGeoLocation } from '../../hooks/useLocation'
import type { IncidentType, Report, ReportInput, GeoPoint } from '../../types'

const emergencyTypes: { type: IncidentType; labelKey: string }[] = [
  { type: 'other', labelKey: 'sos.typeGeneral' },
  { type: 'flood', labelKey: 'sos.typeFlood' },
  { type: 'medical', labelKey: 'sos.typeMedical' },
  { type: 'fire', labelKey: 'sos.typeFire' },
  { type: 'earthquake', labelKey: 'sos.typeEarthquake' },
]

export default function SOS() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const navigate = useNavigate()
  const {
    coords,
    address,
    setAddress,
    setManualLocation,
    status: geoStatus,
    accuracy,
    locateHighAccuracy,
    source,
    isFallback,
  } = useGeoLocation() as ReturnType<typeof useGeoLocation> & { isFallback: boolean }

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [landmark, setLandmark] = useState('')
  const [selectedType, setSelectedType] = useState<IncidentType>('other')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [copied, setCopied] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [editAddressText, setEditAddressText] = useState('')
  const [editPoint, setEditPoint] = useState<GeoPoint | null>(null)
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
          createReport(parsed)
            .then(() => {
              localStorage.removeItem('aapdasetu_pending_sos')
              toast('Pending offline SOS synced successfully!', 'success')
            })
            .catch(() => {
              // Retry on next online cycle
            })
        }
      } catch {
        // Storage access error
      }
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

  const handleRescanGps = async () => {
    setRescanning(true)
    toast('Scanning hardware GPS for high-precision satellites...', 'info')
    try {
      const c = await locateHighAccuracy()
      if (c) {
        toast(`High-precision GPS locked (±${Math.round(c.accuracy ?? 5)}m precision)`, 'success')
      } else {
        toast('GPS signal weak, using best available location estimate.', 'info')
      }
    } catch {
      toast('Could not acquire GPS fix. Please verify location manually.', 'error')
    } finally {
      setRescanning(false)
    }
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
      const foundType = emergencyTypes.find((e) => e.type === selectedType)
      const typeLabel = foundType ? t(foundType.labelKey) : 'Emergency'

      let lat = coords?.latitude
      let lng = coords?.longitude

      if (lat === undefined || lng === undefined) {
        try {
          const pos = await getHighPrecisionPosition()
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch {
          toast('Location unavailable — please pick your location on the map before sending SOS', 'error')
          setShowLocationModal(true)
          setTriggering(false)
          return
        }
      }
      if (lat === undefined || lng === undefined) {
        toast('Location unavailable — please pick your location on the map', 'error')
        setShowLocationModal(true)
        setTriggering(false)
        return
      }

      const fullLandmark = [address, landmark.trim()].filter(Boolean).join(' | ') || undefined

      const input: ReportInput = {
        type: selectedType,
        description: `1-Tap SOS distress trigger: ${typeLabel}`,
        isOneTapSos: true,
        reporterName: name.trim() || undefined,
        reporterPhone: phone.trim(),
        location: { lat, lng },
        landmark: fullLandmark,
      }

      if (!navigator.onLine) {
        localStorage.setItem('aapdasetu_pending_sos', JSON.stringify(input))
        toast('Offline: SOS queued! Will dispatch as soon as network reconnects.', 'info')
        setTriggering(false)
        return
      }

      let triage: { score: number; label: Report['priorityLabel'] } | null = null
      try {
        triage = await aiTriage(input)
      } catch {
        triage = null
      }
      const report = await createReport({ ...input, description: input.description })
      const finalReport =
        report.priorityLabel
          ? report
          : triage
            ? { ...report, priorityScore: triage.score, priorityLabel: triage.label }
            : report

      setResult(finalReport)

      // Save to localStorage for quick tracking
      try {
        localStorage.setItem('aapdasetu_last_sos', JSON.stringify(finalReport))
        const existingTracked = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
        if (!existingTracked.includes(finalReport.trackingId)) {
          localStorage.setItem('aapdasetu_tracked_reports', JSON.stringify([finalReport.trackingId, ...existingTracked]))
        }
      } catch {
        // Storage unavailable
      }

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
    lat: !isFallback ? coords?.latitude : undefined,
    lng: !isFallback ? coords?.longitude : undefined,
    name: name.trim() || undefined,
    type: selectedType,
    phone: phone.trim() || undefined,
    address: address || undefined,
    landmark: landmark.trim() || undefined,
  })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <div className="flex flex-col items-center text-center">
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-red-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 shadow-xs mono">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
              {t('sos.channelBadge')}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-300 sm:text-4xl lg:text-5xl">
              {t('sos.title')}
            </h1>
            <p className="mt-2 max-w-lg text-sm text-zinc-500 dark:text-slate-400">
              {t('sos.subtitle')}
            </p>
          </div>

          {/* Location Card */}
          <div className="mt-6 w-full max-w-3xl rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-xs transition-all dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    source === 'gps'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : source === 'manual'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
                      Rescue Dispatch Location
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        source === 'gps'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : source === 'manual'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {source === 'gps'
                        ? 'Live GPS Locked'
                        : source === 'manual'
                        ? 'Manually Verified'
                        : source === 'cached'
                        ? 'Cached GPS'
                        : 'Estimated Area'}
                      {accuracy !== null && accuracy < 5000 && ` (±${Math.round(accuracy)}m)`}
                    </span>
                  </div>

                  <div className="mt-1 font-bold text-sm sm:text-base text-zinc-800 dark:text-slate-300 leading-snug break-words">
                    {address || (geoStatus === 'locating' ? 'Resolving street address...' : 'Bhubaneswar, Odisha, India')}
                  </div>

                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {coords && (
                      <span>
                        {coords.latitude.toFixed(4)}°N, {coords.longitude.toFixed(4)}°E
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleRescanGps}
                      disabled={rescanning}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 cursor-pointer transition font-sans font-semibold"
                    >
                      <RefreshCw className={`h-3 w-3 ${rescanning ? 'animate-spin' : ''}`} />
                      <span>{rescanning ? 'Acquiring GPS…' : 'Re-scan GPS'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditAddressText(address || '')
                  setEditPoint(coords ? { lat: coords.latitude, lng: coords.longitude } : null)
                  setShowLocationModal(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 hover:border-red-300 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/70 cursor-pointer shadow-2xs transition shrink-0"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Correct Area</span>
              </button>
            </div>
          </div>

          {isOffline && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 shadow-xs max-w-3xl w-full">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t('sos.offlineNotice')}</span>
            </div>
          )}

          {!result ? (
            <>
              {/* Category + Contact form — wider on desktop */}
              <div className="mt-6 w-full max-w-3xl space-y-5">
                {/* Emergency Category Tiles */}
                <div className="text-left">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-300 mono">
                    {t('sos.categoryTitle')}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {emergencyTypes.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setSelectedType(item.type)}
                        className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold transition-all cursor-pointer ${
                          selectedType === item.type
                            ? 'border-red-600 bg-red-50 text-red-900 shadow-xs ring-2 ring-red-200 dark:border-red-500 dark:bg-red-950/70 dark:text-red-200 dark:ring-red-900'
                            : 'border-zinc-200/80 bg-white text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-300'
                        }`}
                      >
                        <span className="leading-tight">{t(item.labelKey)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rescue Details Card */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 text-left shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                  <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-slate-200 mono">
                      {t('sos.contactTitle')}
                    </span>
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400">* Mobile required for rescue call</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-slate-300">
                        {t('sos.phone')}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                          className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-sm font-mono outline-none transition dark:bg-[#222222] dark:text-slate-300 ${
                            phoneError
                              ? 'border-red-500 bg-red-50 ring-2 ring-red-200 dark:border-red-500 dark:bg-red-950/30 dark:ring-red-900'
                              : 'border-zinc-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-white/[0.1]'
                          }`}
                        />
                      </div>
                      {phoneError && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
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
              </div>

              {/* SOS Button — full width on all screens */}
              <div className="mt-6 mb-4 flex flex-col items-center justify-center w-full max-w-3xl">
                <button
                  type="button"
                  onClick={trigger}
                  disabled={triggering}
                  aria-label="Press for Emergency Satellite SOS Dispatch"
                  className="
                    relative flex h-14 sm:h-16 w-full
                    flex-row items-center justify-center gap-2 sm:gap-3
                    rounded-2xl
                    bg-red-600
                    text-white
                    font-bold
                    shadow-md
                    transition-all duration-150
                    hover:bg-red-700
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-80
                    select-none
                  "
                >
                  {triggering ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span className="text-base font-bold uppercase tracking-wide">
                        Dispatching SOS Signal…
                      </span>
                    </>
                  ) : (
                    <>
                      <Siren className="h-6 w-6" />
                      <span className="text-sm sm:text-lg font-extrabold uppercase tracking-tight">
                        Send SOS Distress Signal Now
                      </span>
                    </>
                  )}
                </button>

                <p className="mt-3 max-w-lg text-xs text-slate-500 dark:text-slate-400 text-center">
                  * Tap to alert response units immediately. Your exact GPS coordinates and contact phone will be broadcasted to NDRF/SDRF command.
                </p>
              </div>

              {/* Offline Fallback */}
              <div className="mt-3 w-full max-w-3xl space-y-2 rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                  OFFLINE FALLBACK OPTIONS
                </span>
                <a
                  href={emergencySmsLink}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-[#f4f4f5] py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>1-Tap Emergency SMS (112 Offline Fallback)</span>
                </a>
              </div>
            </>
          ) : (
            /* Result screen */
            <div className="mt-6 w-full max-w-3xl space-y-5 rounded-2xl border border-red-200 bg-white p-6 text-left shadow-xs dark:border-red-900/50 dark:bg-[#1a1a1a]">
              <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950/50 dark:text-red-300">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <h2 className="text-sm font-bold">SOS Distress Signal Broadcasted!</h2>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                    Disaster control room & nearby rescue units have been notified with your phone and GPS location.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-[#f4f4f5] p-4 dark:border-white/[0.08] dark:bg-[#151515]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                      YOUR INCIDENT TRACKING ID
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xl sm:text-2xl font-bold text-zinc-800 dark:text-slate-300">
                        {result.trackingId}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyTrackingId(result.trackingId)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <PriorityBadge label={result.priorityLabel} />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-200/80 pt-2 text-xs text-zinc-500 dark:border-white/[0.08] dark:text-slate-400">
                  <span>Urgency Score: <strong>{result.priorityScore}/100</strong></span>
                  <span>Contact: <strong className="mono">{result.reporterPhone}</strong></span>
                </div>
              </div>

              {/* Copyable Report Summary */}
              <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                    Report Summary — Copy & Share
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const reportText = [
                        `AapdaSetu SOS Report`,
                        `━━━━━━━━━━━━━━━━━━`,
                        `Tracking ID: ${result.trackingId}`,
                        `Priority: ${result.priorityLabel} (${result.priorityScore}/100)`,
                        `Type: ${selectedType}`,
                        `Contact: ${result.reporterPhone}`,
                        `Name: ${name || 'N/A'}`,
                        `Location: ${address || 'N/A'}`,
                        coords ? `GPS: ${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E` : '',
                        `Landmark: ${landmark || 'N/A'}`,
                        `Time: ${new Date().toLocaleString()}`,
                        `━━━━━━━━━━━━━━━━━━`,
                        `Track: ${window.location.origin}/track?id=${result.trackingId}`,
                      ].filter(Boolean).join('\n')
                      navigator.clipboard.writeText(reportText).then(() => {
                        setCopied(true)
                        toast('Full report copied to clipboard')
                        setTimeout(() => setCopied(false), 3000)
                      })
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copied!' : 'Copy All'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[#f4f4f5] p-3 text-[11px] leading-relaxed text-zinc-700 mono dark:bg-[#151515] dark:text-slate-400">
{`AapdaSetu SOS Report
━━━━━━━━━━━━━━━━━━
Tracking ID: ${result.trackingId}
Priority: ${result.priorityLabel} (${result.priorityScore}/100)
Type: ${selectedType}
Contact: ${result.reporterPhone}
Name: ${name || 'N/A'}
Location: ${address || 'N/A'}${coords ? `\nGPS: ${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E` : ''}
Landmark: ${landmark || 'N/A'}
Time: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━
Track: ${typeof window !== 'undefined' ? window.location.origin : ''}/track?id=${result.trackingId}`}
                </pre>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigate(`/track?id=${encodeURIComponent(result.trackingId)}`)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white cursor-pointer"
                >
                  <span>Track Live Response Status</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/report-damage')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/80 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 cursor-pointer"
                >
                  <span>Facing Broken Home / Pipeline Damage? Upload for AI Relief</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null)
                    setPhone('')
                    setName('')
                    setLandmark('')
                  }}
                  className="w-full rounded-xl border border-zinc-200/80 bg-white py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 cursor-pointer"
                >
                  Trigger Another SOS
                </button>
              </div>

              <div className="border-t border-zinc-200/80 pt-4 dark:border-white/[0.08]">
                <span className="block text-center text-xs font-bold text-slate-400 mono mb-2 uppercase">
                  Direct Emergency Helplines (Toll-Free)
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <a href="tel:112" className="rounded-xl bg-[#f4f4f5] p-2.5 text-zinc-700 transition hover:bg-zinc-200 dark:bg-[#222222] dark:text-slate-200">
                    <div className="text-base font-bold text-red-600 mono">112</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">National SOS</div>
                  </a>
                  <a href="tel:108" className="rounded-xl bg-[#f4f4f5] p-2.5 text-zinc-700 transition hover:bg-zinc-200 dark:bg-[#222222] dark:text-slate-200">
                    <div className="text-base font-bold text-amber-600 mono">108</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Ambulance</div>
                  </a>
                  <a href="tel:1070" className="rounded-xl bg-[#f4f4f5] p-2.5 text-zinc-700 transition hover:bg-zinc-200 dark:bg-[#222222] dark:text-slate-200">
                    <div className="text-base font-bold text-emerald-600 mono">1070</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Disaster Ops</div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Location Correction & Map Picker Modal */}
      <Modal
        open={showLocationModal}
        title="Correct Emergency Location"
        onClose={() => setShowLocationModal(false)}
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-zinc-500 dark:text-slate-400">
            Ensure rescue teams reach your exact location. You can type your local neighborhood/address, choose a quick region, or tap the map to place a precise pin.
          </p>

          {/* Manual Address Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Address / Area / Landmark &amp; PIN Code
              </label>
            </div>
            <input
              value={editAddressText}
              onChange={(e) => setEditAddressText(e.target.value)}
              placeholder="e.g. Flat 302, Gayatri Vihar, Sundarpada, Bhubaneswar - 751002"
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              * Rescue teams will see your exact custom address, building name, and PIN code.
            </p>
          </div>

          {/* Quick Regional Presets */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
              Quick Region Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'Bhubaneswar (Sundarpada)', lat: 20.2371, lng: 85.8114, addr: 'Sundarpada, Bhubaneswar, Odisha - 751002' },
                { name: 'Bhubaneswar (Old Town)', lat: 20.2365, lng: 85.8336, addr: 'Lingaraj, Old Town, Bhubaneswar - 751002' },
                { name: 'Bhubaneswar (Patia)', lat: 20.3534, lng: 85.8225, addr: 'Patia / KIIT, Bhubaneswar - 751024' },
                { name: 'Cuttack', lat: 20.4625, lng: 85.8828, addr: 'Badambadi, Cuttack, Odisha - 753001' },
                { name: 'Puri', lat: 19.8135, lng: 85.8312, addr: 'Puri Beach Road, Odisha - 752001' },
                { name: 'Kolkata (Salt Lake)', lat: 22.5726, lng: 88.3639, addr: 'Sector V, Salt Lake, Kolkata - 700091' },
                { name: 'Howrah', lat: 22.5958, lng: 88.2636, addr: 'Howrah Station Area, West Bengal - 711101' },
                { name: 'Sundarbans Coastal', lat: 21.9497, lng: 88.8997, addr: 'Sundarbans Coastal Delta, West Bengal - 743370' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setEditPoint({ lat: preset.lat, lng: preset.lng })
                    setEditAddressText(preset.addr)
                  }}
                  className="rounded-lg border border-zinc-200/80 bg-[#f4f4f5] px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:border-slate-400 hover:bg-white dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer transition"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
              Tap Map or Search to Reposition Pin
            </label>
            <div className="overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.1]">
              <LandmarkPicker
                value={
                  editPoint ||
                  (coords
                    ? { lat: coords.latitude, lng: coords.longitude }
                    : { lat: 20.2706, lng: 85.8334 })
                }
                onChange={(p, addr) => {
                  setEditPoint(p)
                  // Only auto-fill if user has not entered a custom address
                  if (addr && !editAddressText.trim()) {
                    setEditAddressText(addr)
                  }
                }}
                height="220px"
              />
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowLocationModal(false)}
              className="rounded-xl border border-zinc-200/80 px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:border-white/[0.1] dark:text-slate-300 dark:hover:bg-[#252525] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (editPoint) {
                  setManualLocation(editPoint, editAddressText.trim() || undefined)
                } else if (editAddressText.trim()) {
                  setAddress(editAddressText.trim())
                }
                setShowLocationModal(false)
                toast('Emergency dispatch location updated successfully!', 'success')
              }}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 cursor-pointer"
            >
              Save & Apply Location
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
