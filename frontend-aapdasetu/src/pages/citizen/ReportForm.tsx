import { useState } from 'react'
import { createReport } from '../../api/endpoints'
import { aiTriage } from '../../api/ai'
import { Field, Input, Select, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'
import PriorityBadge from '../../components/common/PriorityBadge'
import LandmarkPicker from '../../components/map/LandmarkPicker'
import { useToast } from '../../components/common/Toast'
import { fileToDataUrl, getCurrentPosition, reverseGeocode } from '../../lib/helpers'
import type { GeoPoint, IncidentType, MediaPayload, Report, ReportInput } from '../../types'

const incidentTypes: { value: IncidentType; label: string }[] = [
  { value: 'fire', label: 'Fire' },
  { value: 'flood', label: 'Flood' },
  { value: 'medical', label: 'Medical' },
  { value: 'missing_person', label: 'Missing Person' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'accident', label: 'Accident' },
  { value: 'other', label: 'Other' },
]

const steps = ['Incident', 'Victim & Medical', 'Media', 'Review']

export default function ReportForm() {
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<Report | null>(null)

  const [type, setType] = useState<IncidentType>('other')
  const [description, setDescription] = useState('')
  const [landmark, setLandmark] = useState('')
  const [landmarkPoint, setLandmarkPoint] = useState<GeoPoint | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [reporterName, setReporterName] = useState('')
  const [reporterPhone, setReporterPhone] = useState('')
  const [age, setAge] = useState('')
  const [groupSize, setGroupSize] = useState('')
  const [isPregnant, setIsPregnant] = useState(false)
  const [isCardiac, setIsCardiac] = useState(false)
  const [isBleeding, setIsBleeding] = useState(false)
  const [missingName, setMissingName] = useState('')
  const [missingAge, setMissingAge] = useState('')
  const [media, setMedia] = useState<MediaPayload[]>([])

  const handleLandmarkPick = async (p: GeoPoint, address?: string) => {
    setLandmarkPoint(p)
    setShowMap(false)
    if (address) {
      setLandmark(address)
      return
    }
    setLandmark('Locating address…')
    try {
      const addr = await reverseGeocode(p)
      setLandmark(addr ?? `Landmark at ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`)
    } catch {
      setLandmark(`Landmark at ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`)
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const items: MediaPayload[] = []
    for (const file of Array.from(files).slice(0, 3)) {
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

  const validatePhone = (raw: string) => {
    const clean = raw.replace(/\D/g, '')
    return clean.length >= 10 && clean.length <= 15
  }

  const submit = async () => {
    if (!reporterPhone.trim() || !validatePhone(reporterPhone.trim())) {
      toast('Please provide a valid 10-digit mobile number in Step 1', 'error')
      setStep(0)
      return
    }

    if (!description.trim()) {
      toast('Please describe the emergency in Step 1', 'error')
      setStep(0)
      return
    }

    setSending(true)
    try {
      const input: ReportInput = {
        type,
        description: description.trim(),
        landmark: landmark.trim() || undefined,
        reporterName: reporterName.trim() || undefined,
        reporterPhone: reporterPhone.trim(),
        victim: {
          age: age ? Number(age) : undefined,
          groupSize: groupSize ? Number(groupSize) : undefined,
          isPregnant,
          isCardiac,
          isBleeding,
        },
        missing:
          type === 'missing_person'
            ? { name: missingName.trim(), age: missingAge ? Number(missingAge) : undefined, desc: description.trim() }
            : undefined,
        media,
      }
      if (landmarkPoint) {
        input.location = landmarkPoint
      } else {
        try {
          const pos = await getCurrentPosition()
          input.location = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        } catch {
          // coordinates optional
        }
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

      toast('Incident report submitted successfully')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Submission failed', 'error')
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white">
            ✓
          </span>
          <div>
            <h1 className="text-base font-bold">Incident Registered with Command Center</h1>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your report is prioritized by the AI triage engine and logged in the dispatch queue.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracking ID — Save this</div>
              <div className="mt-0.5 font-mono text-2xl font-black text-slate-900 dark:text-slate-100">{result.trackingId}</div>
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
            <span>Track Incident Status</span>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </a>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            New Report
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Report an incident</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No login required. A tracking ID lets you follow the response.</p>

      <div className="mt-4 flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-t-lg border-b-2 px-3 py-2 text-center text-xs font-semibold ${
              i === step ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="rounded-b-xl rounded-tr-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Incident type">
              <Select value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
                {incidentTypes.map((it) => (
                  <option key={it.value} value={it.value}>
                    {it.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="What happened?">
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the emergency…" />
            </Field>
            <Field label="Nearest landmark">
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Sector V, Salt Lake" />
            </Field>
            <div className="-mt-1">
              <button
                type="button"
                onClick={() => setShowMap((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                </svg>
                {showMap ? 'Hide map' : landmark ? 'Edit on map' : 'Choose on map'}
              </button>
            </div>
            {showMap && (
              <div>
                <LandmarkPicker value={landmarkPoint} onChange={handleLandmarkPick} />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Click anywhere on the map or drag the marker to set the nearest landmark. The chosen point will be sent
                  as the incident location.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <Input value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Full name (optional)" />
              </Field>
              <Field label="Your phone *">
                <Input
                  type="tel"
                  required
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Victim age">
                <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              </Field>
              <Field label="Group size">
                <Input type="number" value={groupSize} onChange={(e) => setGroupSize(e.target.value)} />
              </Field>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPregnant} onChange={(e) => setIsPregnant(e.target.checked)} /> Pregnancy
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isCardiac} onChange={(e) => setIsCardiac(e.target.checked)} /> Cardiac condition
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isBleeding} onChange={(e) => setIsBleeding(e.target.checked)} /> Active bleeding
              </label>
            </div>
            {type === 'missing_person' && (
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
                <Field label="Missing person name">
                  <Input value={missingName} onChange={(e) => setMissingName(e.target.value)} />
                </Field>
                <Field label="Missing person age">
                  <Input type="number" value={missingAge} onChange={(e) => setMissingAge(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="block w-full text-sm"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Audio / video / photos (base64 payload, max 3 files)</p>
            </div>
            {media.length > 0 && (
              <ul className="space-y-1 text-sm">
                {media.map((m, i) => (
                  <li key={i} className="rounded bg-slate-50 dark:bg-slate-900 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
                    {m.kind} — {m.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <Row label="Type" value={type} />
            <Row label="Description" value={description} />
            <Row label="Landmark" value={landmark} />
            <Row label="Reporter" value={`${reporterName}${reporterPhone ? ` · ${reporterPhone}` : ''}`} />
            <Row label="Media" value={media.length ? `${media.length} file(s)` : 'None'} />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <div className="flex items-center gap-3">
              {!description.trim() && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  Add a description in step 1 to enable submission.
                </span>
              )}
              <Button variant="danger" onClick={submit} disabled={sending || !description.trim()}>
                {sending ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="max-w-[70%] truncate text-right font-medium">{value || '—'}</span>
    </div>
  )
}
