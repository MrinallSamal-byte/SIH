import { useState, useEffect, useRef } from 'react'
import { createReport } from '../../api/endpoints'
import { aiTriage } from '../../api/ai'
import PriorityBadge from '../../components/common/PriorityBadge'
import LandmarkPicker from '../../components/map/LandmarkPicker'
import { useToast } from '../../components/common/Toast'
import { fileToDataUrl, getCurrentPosition, reverseGeocode } from '../../lib/helpers'
import { useLocation } from '../../hooks/useLocation'
import type { GeoPoint, IncidentType, MediaPayload, Report, ReportInput } from '../../types'

const emergencyTypeOptions: { value: IncidentType; label: string; icon: string }[] = [
  { value: 'flood', label: 'Flood / Water Rising', icon: '🌊' },
  { value: 'medical', label: 'Critical Medical Emergency', icon: '🚑' },
  { value: 'earthquake', label: 'Building Collapse / Trapped Victims', icon: '🏚️' },
  { value: 'fire', label: 'Fire / Explosion', icon: '🔥' },
  { value: 'accident', label: 'Road / Transit Accident', icon: '🚗' },
  { value: 'missing_person', label: 'Missing Person Search', icon: '🔍' },
  { value: 'other', label: 'Other Disaster Emergency', icon: '🚨' },
]

export default function ReportForm() {
  const { toast } = useToast()
  const { coords, accuracy, refresh: refreshGps } = useLocation()

  const [selectedType, setSelectedType] = useState<string>('')
  const [gpsAddress, setGpsAddress] = useState<string>('')
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

  // Voice/Video recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [audioSeconds, setAudioSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // Auto-detect and reverse-geocode GPS on mount
  useEffect(() => {
    let active = true
    const initLocation = async () => {
      setLocatingGps(true)
      try {
        const pos = await getCurrentPosition(false, 4000)
        if (!active) return
        const point: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCustomPoint(point)
        setGpsError(null)
        try {
          const addr = await reverseGeocode(point)
          if (active) {
            setGpsAddress(addr ?? `${point.lat.toFixed(4)}°N, ${point.lng.toFixed(4)}°E`)
          }
        } catch {
          if (active) setGpsAddress(`${point.lat.toFixed(4)}°N, ${point.lng.toFixed(4)}°E`)
        }
      } catch {
        if (!active) return
        setGpsError('User denied Geolocation')
        setGpsAddress('Near Unit-1 Market, Bhubaneswar')
      } finally {
        if (active) setLocatingGps(false)
      }
    }
    initLocation()
    return () => {
      active = false
    }
  }, [])

  // Sync coords from useLocation hook if updated
  useEffect(() => {
    if (coords && !gpsAddress) {
      setCustomPoint({ lat: coords.latitude, lng: coords.longitude })
      setGpsError(null)
      reverseGeocode({ lat: coords.latitude, lng: coords.longitude })
        .then((addr) => {
          if (addr) setGpsAddress(addr)
        })
        .catch(() => {})
    }
  }, [coords, gpsAddress])

  const handleRetryGps = async () => {
    setLocatingGps(true)
    setGpsError(null)
    try {
      refreshGps()
      const pos = await getCurrentPosition(false, 4000)
      const point: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setCustomPoint(point)
      const addr = await reverseGeocode(point)
      setGpsAddress(addr ?? `${point.lat.toFixed(4)}°N, ${point.lng.toFixed(4)}°E`)
      toast('GPS location locked successfully!', 'success')
    } catch {
      setGpsError('User denied Geolocation')
      toast('GPS signal blocked. Please type your location/landmark manually.', 'error')
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

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop()
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const items: MediaPayload[] = []
    for (const file of Array.from(files).slice(0, 3 - media.length)) {
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

    setSending(true)
    try {
      let finalLocation = customPoint
      if (!finalLocation && coords) {
        finalLocation = { lat: coords.latitude, lng: coords.longitude }
      }
      if (!finalLocation) {
        finalLocation = { lat: 22.5726, lng: 88.3639 }
      }

      const input: ReportInput = {
        type: selectedType as IncidentType,
        description: description.trim() || `Emergency Report: ${selectedType.toUpperCase()}`,
        landmark: gpsAddress.trim() || undefined,
        reporterName: reporterName.trim() || undefined,
        reporterPhone: cleanPhone,
        location: finalLocation,
        media,
      }

      const triage = await aiTriage(input)
      const report = await createReport(input)
      const finalReport = report.priorityLabel ? report : { ...report, priorityScore: triage.score, priorityLabel: triage.label }
      setResult(finalReport)

      // Save to localStorage
      try {
        const existingTracked = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
        if (!existingTracked.includes(finalReport.trackingId)) {
          localStorage.setItem('aapdasetu_tracked_reports', JSON.stringify([finalReport.trackingId, ...existingTracked]))
        }
      } catch {}

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
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white font-bold">
            ✓
          </span>
          <div>
            <h1 className="text-base font-bold">Incident Registered with Command Center</h1>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your report is prioritized by the AI triage engine and logged in the rescue dispatch queue.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracking ID — Save this</div>
              <div className="mt-0.5 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">{result.trackingId}</div>
            </div>
            <PriorityBadge label={result.priorityLabel} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <span>Priority Score: <strong>{result.priorityScore}/100</strong></span>
            <span>Emergency Type: <strong>{result.type.toUpperCase()}</strong></span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a
            href={`#/track?id=${encodeURIComponent(result.trackingId)}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <span>Track Live Rescue Status</span>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            New Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Emergency Report Form
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Fields marked with <span className="text-red-500 font-bold">*</span> are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* 1. Emergency Type */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            Emergency Type <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              required
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="" disabled>
                Select emergency type...
              </option>
              {emergencyTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
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
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            GPS Location
          </label>
          <div className="rounded-xl border border-slate-300 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                {locatingGps ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                    <span>Detecting GPS location…</span>
                  </>
                ) : gpsError ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400 font-medium">{gpsError}</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      GPS Auto-detected {accuracy ? `(±${Math.round(accuracy)}m)` : ''}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleRetryGps}
                disabled={locatingGps}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer"
              >
                <span>🔄</span>
                <span>Retry GPS</span>
              </button>
            </div>

            <input
              type="text"
              value={gpsAddress}
              onChange={(e) => setGpsAddress(e.target.value)}
              placeholder="e.g., Near Unit-1 Market, Bhubaneswar"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <button
                type="button"
                onClick={() => setShowMap((s) => !s)}
                className="font-bold text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <span>🗺️</span>
                <span>{showMap ? 'Hide map' : 'Adjust location on interactive map'}</span>
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
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* 4. Your Phone Number */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            Your Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-900">
            <span className="flex items-center justify-center bg-slate-100 px-3.5 text-sm font-bold text-slate-700 border-r border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              +91
            </span>
            <input
              type="tel"
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              placeholder="10-digit mobile number"
              required
              className="w-full bg-transparent px-3.5 py-2.5 text-sm font-mono text-slate-800 outline-none placeholder-slate-400 dark:text-slate-100"
            />
          </div>
        </div>

        {/* 5. Video or Voice Recording */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Video or Voice Recording <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              REQUIRED
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
            Record up to 30 seconds (optional but recommended) Record a short video or audio proof of the incident.
          </p>

          {/* Hidden File Inputs for native camera / mic */}
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

          <div className="rounded-xl border border-slate-300 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900 shadow-xs space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {/* Record / Upload Video */}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <span className="text-base">🎥</span>
                <span>Record Video</span>
              </button>

              {/* Record Audio with Mic API */}
              {!isRecordingAudio ? (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <span className="text-base">🎙️</span>
                  <span>Record Audio</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 px-3 text-xs font-bold text-white shadow-xs transition animate-pulse cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span>Stop ({audioSeconds}s / 30s)</span>
                </button>
              )}
            </div>

            {/* Attached Media List / Thumbnails */}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {media.map((m, i) => (
                  <div key={i} className="relative rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                    {m.kind === 'image' && m.dataUrl && (
                      <img src={m.dataUrl} alt={m.name} className="h-16 w-full object-cover rounded-md mb-1" />
                    )}
                    {m.kind === 'video' && m.dataUrl && (
                      <video src={m.dataUrl} className="h-16 w-full object-cover rounded-md mb-1" controls />
                    )}
                    {m.kind === 'audio' && m.dataUrl && (
                      <audio src={m.dataUrl} className="w-full mb-1" controls />
                    )}
                    <div className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-300">{m.name}</div>
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 6. Additional Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
            Additional Description
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the emergency in detail..."
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* 7. Submit Button */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            disabled={sending || !selectedType || !reporterPhone.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:disabled:bg-slate-800 dark:disabled:text-slate-600 cursor-pointer"
          >
            {sending ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Dispatching Report…</span>
              </div>
            ) : (
              <>
                <span>✓</span>
                <span>Submit Report</span>
              </>
            )}
          </button>

          {(!selectedType || !reporterPhone.trim()) && (
            <p className="text-center text-[11px] font-medium text-red-500 dark:text-red-400">
              * Select emergency type and enter mobile number to enable submission
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
