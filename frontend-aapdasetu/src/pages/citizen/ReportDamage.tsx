import { useState } from 'react'
import { aiDamageAssessment } from '../../api/ai'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { fileToDataUrl, getCurrentPosition } from '../../lib/helpers'

interface DamageVerdict {
  claimedDamage: boolean
  verified: boolean
  duplicate: boolean
  exifValid: boolean
  exifDeltaKm?: number
  damageGrade: string
  compensationInr: number
  factors: string[]
}

export default function ReportDamage() {
  const { toast } = useToast()
  const [photo, setPhoto] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [verdict, setVerdict] = useState<DamageVerdict | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setPhoto(dataUrl)
    setPreview(URL.createObjectURL(file))
    setVerdict(null)
  }

  const assess = async () => {
    if (!photo) return
    setBusy(true)
    try {
      let reportedLat: number | undefined
      let reportedLng: number | undefined
      try {
        const pos = await getCurrentPosition()
        reportedLat = pos.coords.latitude
        reportedLng = pos.coords.longitude
      } catch {
        // optional
      }
      const trimmedDescription = description.trim()
      setVerdict(await aiDamageAssessment(photo, reportedLat, reportedLng, trimmedDescription || undefined))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Assessment failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Crowdsourced damage assessment</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Submit a property damage photo. The AI engine verifies EXIF geolocation, checks for duplicate claims (pHash),
        grades structural damage, and estimates SDRF compensation.
      </p>

      <div className="mt-4 space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
        <div className="space-y-2">
          <label htmlFor="damage-photo" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Upload photo
          </label>
          <input
            id="damage-photo"
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="damage-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description (optional)
          </label>
          <textarea
            id="damage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Briefly describe the damage, affected area, or any urgent notes"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {preview && <img src={preview} alt="Damage preview" className="max-h-64 w-full rounded-lg object-cover" />}

        <Button onClick={assess} disabled={!photo || busy}>
          {busy ? 'Sending…' : 'Send'}
        </Button>

        {busy && <Loader />}

        {verdict && (
          <div className="space-y-3 rounded-lg bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex items-center gap-2">
              <Badge value={verdict.verified ? 'VERIFIED_VALID' : 'FLAGGED_FRAUD_RISK'} />
              {verdict.duplicate && <Badge value="duplicate" />}
            </div>
            <div className="text-sm">
              <VerdictRow label="AI damage grade" value={verdict.damageGrade} />
              <VerdictRow label="EXIF location verified" value={verdict.exifValid ? 'Yes' : 'No'} />
              {verdict.exifDeltaKm !== undefined && (
                <VerdictRow label="EXIF distance delta" value={`${verdict.exifDeltaKm.toFixed(2)} km`} />
              )}
              <VerdictRow label="Est. SDRF compensation" value={`₹${verdict.compensationInr.toLocaleString('en-IN')}`} />
            </div>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
              {verdict.factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function VerdictRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-200 dark:border-slate-600 py-1">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
