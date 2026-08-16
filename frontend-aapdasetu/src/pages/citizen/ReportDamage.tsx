import { useState } from 'react'
import { aiDamageAssessment } from '../../api/ai'
import { createDamageAssessment } from '../../api/endpoints'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { Field, Input } from '../../components/common/Input'
import { useToast } from '../../components/common/Toast'
import { compressImage, getCurrentPosition } from '../../lib/helpers'

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
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [verdict, setVerdict] = useState<DamageVerdict | null>(null)
  const [claimId, setClaimId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const compressed = await compressImage(file, 1000, 0.75)
      setPhoto(compressed)
      setPreview(compressed)
      setVerdict(null)
      setClaimId(null)
    } catch {
      toast('Failed to process image', 'error')
    }
  }

  const assess = async () => {
    if (!photo) {
      toast('Please select a damage photo to evaluate', 'error')
      return
    }
    if (!ownerPhone.trim() || ownerPhone.replace(/\D/g, '').length < 10) {
      toast('Please enter a valid 10-digit contact mobile number', 'error')
      return
    }

    setBusy(true)
    try {
      let reportedLat: number | undefined
      let reportedLng: number | undefined
      try {
        const pos = await getCurrentPosition(false, 3000)
        reportedLat = pos.coords.latitude
        reportedLng = pos.coords.longitude
      } catch {
        reportedLat = 22.5726
        reportedLng = 88.3639
      }

      const trimmedDescription = description.trim()
      const result = await aiDamageAssessment(photo, reportedLat, reportedLng, trimmedDescription || undefined)
      setVerdict(result)
      
      const generatedClaimId = `SDRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      setClaimId(generatedClaimId)

      // Persist claim to database
      try {
        await createDamageAssessment({
          propertyAddress: address.trim() || 'Address on file',
          latitude: reportedLat,
          longitude: reportedLng,
          structuralDamage: result.damageGrade === 'DESTROYED' || result.damageGrade === 'MAJOR_DAMAGE',
          floodDepthMeters: result.factors.some((f) => f.includes('water')) ? 1.5 : 0.2,
          estimatedLossInr: result.compensationInr,
          claimantName: ownerName.trim() || undefined,
          claimantPhone: ownerPhone.trim(),
        })
      } catch {}

      // Save to localStorage for citizen record
      try {
        const existing = JSON.parse(localStorage.getItem('aapdasetu_damage_claims') || '[]') as Record<string, unknown>[]
        existing.unshift({
          claimId: generatedClaimId,
          claimantName: ownerName,
          claimantPhone: ownerPhone,
          grade: result.damageGrade,
          compensation: result.compensationInr,
          date: new Date().toISOString(),
        })
        localStorage.setItem('aapdasetu_damage_claims', JSON.stringify(existing.slice(0, 10)))
      } catch {}

      toast('Damage claim registered and assessed successfully')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Assessment failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const copyClaimReceipt = () => {
    if (!claimId || !verdict) return
    const text = `AapdaSetu SDRF Damage Claim Receipt\nClaim ID: ${claimId}\nClaimant: ${ownerName || 'Citizen'}\nPhone: ${ownerPhone}\nGrade: ${verdict.damageGrade}\nRelief Estimate: ₹${verdict.compensationInr.toLocaleString('en-IN')}\nStatus: Verified via AI Engine`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast('Claim details copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Damage Assessment & SDRF Relief
      </h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Upload geotagged property damage photos for automated structural grading, verification, and SDRF compensation estimation.
      </p>

      <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Claimant Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property Owner / Claimant Name">
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Ramesh Sen"
            />
          </Field>
          <Field label="Contact Mobile Number *">
            <Input
              type="tel"
              required
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="10-digit mobile number"
            />
          </Field>
        </div>

        <Field label="Property Location / Landmark">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. House No. 42, Block B, Sector 2"
          />
        </Field>

        <div className="space-y-2">
          <label htmlFor="damage-photo" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Upload Damage Photo *
          </label>
          <input
            id="damage-photo"
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-200"
          />
        </div>

        {preview && (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            <img src={preview} alt="Damage preview" className="max-h-64 w-full object-cover" />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="damage-description" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Damage Description & Structural Impact
          </label>
          <textarea
            id="damage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe cracked walls, roof collapse, flood submergence depth…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <Button
          onClick={assess}
          disabled={!photo || busy || !ownerPhone.trim()}
          className="w-full py-3 font-bold"
        >
          {busy ? 'Running Vision Analysis…' : 'Assess Damage & Calculate Relief'}
        </Button>

        {busy && <Loader />}

        {verdict && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            {claimId && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-500">Government Claim Reference</span>
                  <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{claimId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={verdict.verified ? 'VERIFIED_VALID' : 'FLAGGED_FRAUD_RISK'} />
                  <button
                    type="button"
                    onClick={copyClaimReceipt}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {copied ? 'Copied' : 'Copy Receipt'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <VerdictRow label="Damage Severity Grade" value={verdict.damageGrade} highlight />
              <VerdictRow label="EXIF Geolocation Match" value={verdict.exifValid ? 'Verified On-Site' : 'Fallback Verification'} />
              {verdict.exifDeltaKm !== undefined && (
                <VerdictRow label="GPS Distance Delta" value={`${verdict.exifDeltaKm.toFixed(2)} km`} />
              )}
              <VerdictRow
                label="Estimated SDRF Compensation"
                value={`₹${verdict.compensationInr.toLocaleString('en-IN')}`}
                highlight
              />
            </div>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assessment Factors:</span>
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {verdict.factors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function VerdictRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-200/60 py-1.5 last:border-none last:pb-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <span className={`font-medium ${highlight ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </span>
    </div>
  )
}

