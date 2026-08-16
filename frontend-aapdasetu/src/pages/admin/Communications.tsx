import { useState } from 'react'
import { broadcastAlert } from '../../api/endpoints'
import { Field, Input, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import { useToast } from '../../components/common/Toast'
import type { AlertSeverity } from '../../types'

const CHANNELS = [
  { value: 'web', label: 'Web (public alerts feed)' },
  { value: 'sms', label: 'SMS (Twilio — server-side credential)' },
  { value: 'whatsapp', label: 'WhatsApp (Cloud API — server-side credential)' },
]

export default function Communications() {
  const { toast } = useToast()
  const [severity, setSeverity] = useState<AlertSeverity>('warning')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [region, setRegion] = useState('')
  const [channels, setChannels] = useState<string[]>(['web'])
  const [recipients, setRecipients] = useState('')
  const [sending, setSending] = useState(false)

  const toggleChannel = (value: string) =>
    setChannels((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]))

  const send = async () => {
    if (!title.trim() || !body.trim() || channels.length === 0) return
    setSending(true)
    try {
      const result = await broadcastAlert({
        severity,
        title,
        body,
        region: region || undefined,
        channels,
        recipientNumbers: recipients
          ? recipients.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      })
      toast(`Broadcast sent — ${result.delivered} message(s) via ${result.channels.join(', ')}`)
      setTitle('')
      setBody('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Broadcast failed', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Multi-channel alert broadcaster</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Push warnings across SMS, WhatsApp, and the public web channel.
      </p>

      <div className="mt-4 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <Field label="Severity">
          <div className="flex gap-2">
            {(['info', 'warning', 'critical'] as AlertSeverity[]).map((s) => (
              <Button
                key={s}
                variant={severity === s ? (s === 'critical' ? 'danger' : s === 'warning' ? 'primary' : 'secondary') : 'outline'}
                onClick={() => setSeverity(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </Field>

        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cyclone warning" />
        </Field>
        <Field label="Message">
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Emergency broadcast message…" />
        </Field>
        <Field label="Target region (optional)">
          <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="North 24 Parganas" />
        </Field>

        <Field label="Channels">
          <div className="space-y-2">
            {CHANNELS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={channels.includes(c.value)} onChange={() => toggleChannel(c.value)} />
                {c.label}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Recipient numbers (comma separated, for SMS/WhatsApp)">
          <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="+919000000001,+919000000002" />
        </Field>

        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          <Badge value="server-side" /> Twilio SID/Auth + WhatsApp token/phone-number-id are consumed by the Express
          backend (<code>POST /api/communications/broadcast</code>). Configure them in the{' '}
          <a href="#/admin/settings" className="underline">Settings</a> view — never in the browser bundle.
        </div>

        <Button variant="danger" onClick={send} disabled={sending || !title.trim() || !body.trim() || channels.length === 0}>
          {sending ? 'Broadcasting…' : 'Broadcast alert'}
        </Button>
      </div>
    </div>
  )
}
