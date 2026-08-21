import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  MapPin,
  Camera,
  Mic,
  Square,
  X,
  CheckCircle2,
  ArrowRight,
  User,
  Loader2,
  RefreshCw,
  Copy
} from 'lucide-react'
import { createReport } from '../../api/endpoints'
import { aiTriage } from '../../api/ai'
import PriorityBadge from '../../components/common/PriorityBadge'
import LandmarkPicker from '../../components/map/LandmarkPicker'
import { useToast } from '../../components/common/Toast'
import { fileToDataUrl, reverseGeocode } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import { useGeoLocation } from '../../hooks/useLocation'
import type { GeoPoint, IncidentType, MediaPayload, Report, ReportInput } from '../../types'

const emergencyTypeOptions: { value: IncidentType; key: string }[] = [
  { value: 'flood', key: 'report.typeFlood' },
  { value: 'medical', key: 'report.typeMedical' },
  { value: 'earthquake', key: 'report.typeEarthquake' },
  { value: 'fire', key: 'report.typeFire' },
  { value: 'accident', key: 'report.typeAccident' },
  { value: 'missing_person', key: 'report.typeMissing' },
  { value: 'other', key: 'report.typeOther' },
]

export default function ReportForm() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { coords, address: detectedAddress, accuracy, source, isFallback, locateHighAccuracy } = useGeoLocation() as ReturnType<typeof useGeoLocation> & { source: string; isFallback: boolean; locateHighAccuracy: () => Promise<any> }

  const [selectedType, setSelectedType] = useState<string>('')
  const [gpsAddress, setGpsAddress] = useState<string>(detectedAddress || '')
  const [customPoint, setCustomPoint] = useState<GeoPoint | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [locatingGps, setLocatingGps] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [reporterName, setReporterName] = useState('')
  const [reporterPhone, setReporterPhone] = useState('')
  const [description, setDescription] = useState('')
  const [media, setMedia] = useState<MediaPayload[]>([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [copied, setCopied] = useState(false)

  // Voice/Video recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [audioSeconds, setAudioSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (detectedAddress && !gpsAddress) {
      setGpsAddress(detectedAddress)
    }
  }, [detectedAddress])

  useEffect(() => {
    if (coords && !customPoint) {
      const point: GeoPoint = { lat: coords.latitude, lng: coords.longitude }
      setCustomPoint(point)
      setGpsError(null)
      if (!gpsAddress) {
        reverseGeocode(point)
          .then((addr) => {
            if (addr) setGpsAddress(addr)
            else setGpsAddress(`${point.lat.toFixed(4)}°N, ${point.lng.toFixed(4)}°E`)
          })
          .catch(() => {
            setGpsAddress(`${point.lat.toFixed(4)}°N, ${point.lng.toFixed(4)}°E`)
          })
      }
    }
  }, [coords])

  const handleRetryGps = async () => {
    setLocatingGps(true)
    setGpsError(null)
    try {
      const pos = await locateHighAccuracy()
      if (pos) {
        const point: GeoPoint = { lat: pos.latitude, lng: pos.longitude }
        setCustomPoint(point)
        const addr = await reverseGeocode(point)
        setGpsAddress(addr ?? `${point.lat.toFixed(4)}°N, ${point.lng.toFixed(4)}°E`)
        toast(`High-precision GPS locked (±${Math.round(pos.accuracy ?? 5)}m)`, 'success')
      } else {
        throw new Error('no gps')
      }
    } catch {
      if (coords && !isFallback) {
        setCustomPoint({ lat: coords.latitude, lng: coords.longitude })
        toast('Using last known location.', 'info')
      } else {
        setGpsError('Location unavailable. Type your area or pick on map.')
        toast('Location unavailable. Please pick on map or enter manually.', 'info')
      }
    } finally {
      setLocatingGps(false)
    }
  }

  const handleLandmarkPick = async (p: GeoPoint, address?: string) => {
    setCustomPoint(p)
    setShowMap(false)
    if (address) {
      setGpsAddress(address)
      return
    }
    setGpsAddress('Locating address…')
    try {
      const addr = await reverseGeocode(p)
      setGpsAddress(addr ?? `Landmark at ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`)
    } catch {
      setGpsAddress(`Landmark at ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`)
    }
  }

  // Audio Recording Controller
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          setMedia((prev) => [
            ...prev,
            {
              kind: 'audio',
              name: `voice_note_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.webm`,
              mime: 'audio/webm',
              dataUrl,
            },
          ])
        }
        reader.readAsDataURL(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
        setIsRecordingAudio(false)
        if (timerRef.current) clearInterval(timerRef.current)
      }

      recorder.start()
      setIsRecordingAudio(true)
      setAudioSeconds(0)
      timerRef.current = setInterval(() => {
        setAudioSeconds((sec) => {
          if (sec >= 30) {
            recorder.stop()
            return 30
          }
          return sec + 1
        })
      }, 1000)
    } catch {
      toast('Microphone access denied. You can upload an audio file instead.', 'error')
      audioInputRef.current?.click()
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      try {
        audioStreamRef.current?.getTracks().forEach((t) => t.stop())
      } catch {
        /* ignore */
      }
      try {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop()
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav']
    const MAX = 5 * 1024 * 1024
    const items: MediaPayload[] = []
    for (const file of Array.from(files).slice(0, 3 - media.length)) {
      if (file.size > MAX) {
        toast(`File ${file.name} exceeds 5MB limit`, 'error')
        continue
      }
      if (file.type && !ALLOWED.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
        toast(`File ${file.name} type not allowed`, 'error')
        continue
      }
      const dataUrl = await fileToDataUrl(file)
      items.push({
        kind: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image',
        name: file.name,
        mime: file.type,
        dataUrl,
      })
    }
    setMedia((prev) => [...prev, ...items])
  }

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedType) {
      toast('Please select an Emergency Type', 'error')
      return
    }

    const cleanPhone = reporterPhone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      toast('Please enter a valid 10-digit mobile number for emergency contact', 'error')
      return
    }
    if (!description.trim()) {
      toast('Please describe the emergency (required to identify the problem)', 'error')
      return
    }

    let finalLocation = customPoint
    if (!finalLocation && coords) {
      finalLocation = { lat: coords.latitude, lng: coords.longitude }
    }
    if (!finalLocation) {
      toast('Please allow GPS or pick your location on the map before submitting', 'error')
      setSending(false)
      return
    }

    setSending(true)
    try {
      const input: ReportInput = {
        type: selectedType as IncidentType,
        description: description.trim() || `Emergency Report: ${selectedType.toUpperCase()}`,
        landmark: gpsAddress.trim() || undefined,
        reporterName: reporterName.trim() || undefined,
        reporterPhone: cleanPhone,
        location: finalLocation,
        media,
      }

      const report = await createReport(input)
      let finalReport = report
      if (!report.priorityLabel) {
        try {
          const triage = await aiTriage(input)
          finalReport = { ...report, priorityScore: triage.score, priorityLabel: triage.label }
        } catch {
          finalReport = report
        }
      }
      setResult(finalReport)

      // Save to localStorage
      try {
        const existingTracked = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
        if (!existingTracked.includes(finalReport.trackingId)) {
          localStorage.setItem('aapdasetu_tracked_reports', JSON.stringify([finalReport.trackingId, ...existingTracked]))
        }
      } catch {
        // Storage unavailable
      }

      toast('Emergency incident reported successfully!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Submission failed', 'error')
    } finally {
      setSending(false)
    }
  }

  // Confirmation View
  if (result) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-6 shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h1 className="text-base font-bold">Incident Registered with Command Center</h1>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
              Your report is prioritized by the AI triage engine and logged in the rescue dispatch queue.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-200/80 bg-[#f4f4f5] p-5 dark:border-white/[0.08] dark:bg-[#151515]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Tracking ID — Save this</div>
              <div className="mt-0.5 font-mono text-2xl font-bold text-zinc-800 dark:text-slate-300">{result.trackingId}</div>
            </div>
            <PriorityBadge label={result.priorityLabel} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-zinc-200/80 pt-2 text-xs text-zinc-500 dark:border-white/[0.08] dark:text-slate-400">
            <span>Priority Score: <strong>{result.priorityScore}/100</strong></span>
            <span>Type: <strong className="mono">{result.type.toUpperCase()}</strong></span>
          </div>
        </div>

        {/* Copyable Report Summary */}
        <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
              Report Summary — Copy & Share
            </span>
            <button
              type="button"
              onClick={() => {
                const reportText = [
                  `AapdaSetu Incident Report`,
                  `━━━━━━━━━━━━━━━━━━`,
                  `Tracking ID: ${result.trackingId}`,
                  `Priority: ${result.priorityLabel} (${result.priorityScore}/100)`,
                  `Type: ${result.type.toUpperCase()}`,
                  `Contact: ${result.reporterPhone}`,
                  `Name: ${result.reporterName || 'N/A'}`,
                  `Location: ${gpsAddress || 'N/A'}`,
                  customPoint ? `GPS: ${customPoint.lat.toFixed(4)}°N, ${customPoint.lng.toFixed(4)}°E` : '',
                  `Description: ${description || 'N/A'}`,
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
{`AapdaSetu Incident Report
━━━━━━━━━━━━━━━━━━
Tracking ID: ${result.trackingId}
Priority: ${result.priorityLabel} (${result.priorityScore}/100)
Type: ${result.type.toUpperCase()}
Contact: ${result.reporterPhone}
Name: ${result.reporterName || 'N/A'}
Location: ${gpsAddress || 'N/A'}${customPoint ? `\nGPS: ${customPoint.lat.toFixed(4)}°N, ${customPoint.lng.toFixed(4)}°E` : ''}
Description: ${description || 'N/A'}
Time: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━
Track: ${typeof window !== 'undefined' ? window.location.origin : ''}/track?id=${result.trackingId}`}
          </pre>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={`#/track?id=${encodeURIComponent(result.trackingId)}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3.5 text-sm font-bold text-white shadow-xs hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white"
          >
            <span>Track Live Rescue Status</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setSelectedType('')
              setReporterName('')
              setReporterPhone('')
              setDescription('')
              setMedia([])
              setCustomPoint(null)
              setGpsAddress('')
            }}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-3.5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200"
          >
            New Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-left">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-6 w-6 text-zinc-800 dark:text-slate-300" />
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-800 dark:text-slate-300 tracking-tight">
            {t('report.pageTitle')}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t('report.pageSubtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* 1. Emergency Type */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 mb-1.5 mono uppercase">
            {t('report.categoryLabel')}
          </label>
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              required
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-300 dark:focus:border-slate-500"
            >
              <option value="" disabled>
                {t('report.selectTypePlaceholder')}
              </option>
              {emergencyTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.key)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. GPS Location Card */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 mb-1.5 mono uppercase">
            {t('report.gpsTitle')} <span className="text-red-600">*</span>
          </label>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/[0.1] dark:bg-[#1a1a1a] shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                {locatingGps ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-zinc-800 dark:bg-slate-100 animate-ping" />
                    <span>{t('report.gpsDetecting')}</span>
                  </>
                ) : gpsError ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400 font-medium">{gpsError}</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`font-semibold ${isFallback || (accuracy && accuracy >= 1000) ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {isFallback || source !== 'gps' ? 'Location estimated — tap Retry for precise GPS' : <>{t('report.gpsAutoDetected')} {accuracy && accuracy < 1000 ? `(±${Math.round(accuracy)}m)` : ''}</>}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleRetryGps}
                disabled={locatingGps}
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{t('report.gpsRetry')}</span>
              </button>
            </div>

            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={gpsAddress}
                onChange={(e) => setGpsAddress(e.target.value)}
                placeholder={t('report.gpsPlaceholder')}
                className="w-full rounded-xl border border-zinc-200/80 bg-[#f4f4f5] pl-10 pr-3.5 py-2.5 text-sm text-zinc-700 outline-none transition focus:border-zinc-500 focus:bg-white dark:border-white/[0.08] dark:bg-[#151515] dark:text-slate-300"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <button
                type="button"
                onClick={() => setShowMap((s) => !s)}
                className="font-bold text-zinc-800 hover:underline dark:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{showMap ? t('report.hideMap') : t('report.adjustMap')}</span>
              </button>
            </div>

            {showMap && (
              <div className="pt-2">
                <LandmarkPicker value={customPoint} onChange={handleLandmarkPick} />
              </div>
            )}
          </div>
        </div>

        {/* 3. Your Name */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 mb-1.5 mono uppercase">
            {t('report.nameLabel')}
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder={t('report.namePlaceholder')}
              className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2.5 text-sm text-zinc-700 placeholder-slate-400 outline-none transition focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-300 dark:focus:border-slate-500"
            />
          </div>
        </div>

        {/* 4. Your Phone Number */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 mb-1.5 mono uppercase">
            {t('report.phoneLabel')}
          </label>
          <div className="flex rounded-xl border border-zinc-200 bg-white overflow-hidden focus-within:border-slate-900 dark:border-white/[0.1] dark:bg-[#1a1a1a]">
            <span className="flex items-center justify-center bg-slate-100 px-3.5 text-xs font-bold text-zinc-600 border-r border-zinc-200/80 dark:bg-[#222222] dark:text-slate-300 dark:border-white/[0.1] mono">
              +91
            </span>
            <input
              type="tel"
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              placeholder={t('report.phonePlaceholder')}
              required
              className="w-full bg-transparent px-3.5 py-2.5 text-sm font-mono text-zinc-700 outline-none placeholder-slate-400 dark:text-slate-300"
            />
          </div>
        </div>

        {/* 5. Video or Voice Proof Upload */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-zinc-700 dark:text-slate-200 mono uppercase">
              {t('report.mediaTitle')}
            </label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
              {t('common.optional')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
            {t('report.mediaDesc')}
          </p>

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*,image/*"
            capture="environment"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/[0.1] dark:bg-[#1a1a1a] shadow-xs space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 px-3 text-xs font-bold text-zinc-600 shadow-xs transition hover:bg-zinc-50 hover:border-slate-400 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200 cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>{t('report.uploadMedia')}</span>
              </button>

              {!isRecordingAudio ? (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 px-3 text-xs font-bold text-zinc-600 shadow-xs transition hover:bg-zinc-50 hover:border-slate-400 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-200 cursor-pointer"
                >
                  <Mic className="h-4 w-4" />
                  <span>{t('report.recordVoice')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 px-3 text-xs font-bold text-white shadow-xs transition animate-pulse cursor-pointer"
                >
                  <Square className="h-4 w-4" />
                  <span>{t('report.stopRecord')} ({audioSeconds}s / 30s)</span>
                </button>
              )}
            </div>

            {/* Attached Media List */}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                {media.map((m, i) => (
                  <div key={i} className="relative rounded-lg border border-zinc-200/80 bg-[#f4f4f5] p-2 dark:border-white/[0.08] dark:bg-[#151515]">
                    {m.kind === 'image' && m.dataUrl && (
                      <img src={m.dataUrl} alt={m.name} className="h-16 w-full object-cover rounded-md mb-1" />
                    )}
                    {m.kind === 'video' && m.dataUrl && (
                      <video src={m.dataUrl} className="h-16 w-full object-cover rounded-md mb-1" controls />
                    )}
                    {m.kind === 'audio' && m.dataUrl && (
                      <audio src={m.dataUrl} className="w-full mb-1" controls />
                    )}
                    <div className="truncate text-[10px] font-semibold text-zinc-600 dark:text-slate-300">{m.name}</div>
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 6. Description */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-slate-200 mb-1.5 mono uppercase">
            {t('report.descLabel')} <span className="text-red-600">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('report.descPlaceholder')}
            className="w-full rounded-2xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-700 placeholder-slate-400 outline-none transition focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-300 dark:focus:border-slate-500"
          />
        </div>

        {(() => {
          const lower = description.toLowerCase()
          const isCriticalDesc = ['bleed','blood','trapped','drown','sinking','heart attack','chest pain','stroke','electrocute','severe burn','fire','choking','snake','poison','collapse','debris','fracture','dying','flood rising'].some(k=>lower.includes(k))
          return isCriticalDesc ? (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 flex items-center justify-between gap-3">
              <span className="font-bold">Life-threatening keywords detected — use Emergency SOS for immediate dispatch?</span>
              <a href="#/sos" className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700">Go to SOS</a>
            </div>
          ) : null
        })()}

        {/* 7. Submit Button */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            disabled={sending || !selectedType || !reporterPhone.trim() || !description.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-4 text-base font-bold text-white shadow-md transition hover:bg-zinc-700 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white dark:disabled:bg-slate-800 dark:disabled:text-zinc-500 cursor-pointer"
          >
            {sending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('report.submitting')}</span>
              </div>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                <span>{t('report.submitBtn')}</span>
              </>
            )}
          </button>

          {(!selectedType || !reporterPhone.trim()) && (
            <p className="text-center text-xs font-medium text-red-500 dark:text-red-400">
              {t('report.submitValidation')}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
