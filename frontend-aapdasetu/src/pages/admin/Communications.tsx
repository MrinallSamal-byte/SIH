import { useState } from 'react'
import {
  Megaphone,
  Globe,
  Smartphone,
  MessageSquare,
  Radio,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { broadcastAlert } from '../../api/endpoints'
import { Field, Input, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import type { AlertSeverity } from '../../types'

const PRESETS: {
  title: string
  body: string
  severity: AlertSeverity
  region: string
  labelKey: string
}[] = [
  {
    labelKey: 'cm.preset1Label',
    title: 'Severe Cyclone Landfall Warning — Immediate Coastal Evacuation',
    body: 'NDMA Advisory: Severe Cyclonic Storm approaching coastline within 4 hours. Wind speeds 110-120 km/h with 1.5m storm surge. Move to nearest designated cyclone shelters immediately. Keep 112 hotline ready.',
    severity: 'critical',
    region: 'North 24 Parganas & Sundarbans',
  },
  {
    labelKey: 'cm.preset2Label',
    title: 'River Breach & Flash Flood Red Alert',
    body: 'Dam floodgates opened. Low-lying sectors facing rapid 2m water rise. Do NOT attempt to cross submerged culverts. Follow designated AapdaSetu Safe Evacuation Corridors to higher ground.',
    severity: 'critical',
    region: 'Sector 5, Salt Lake & Rajarhat',
  },
  {
    labelKey: 'cm.preset3Label',
    title: 'Water Supply Contamination Advisory — Boil Water Notice',
    body: 'SDRF Health Notice: Municipal pipelines submerged under flood runoff. Boil all drinking water for minimum 3 minutes or use halogen chlorine purification tablets available at relief camps.',
    severity: 'warning',
    region: 'All Flood Affected Sectors',
  },
  {
    labelKey: 'cm.preset4Label',
    title: 'Danger Level Receded — Rehabilitation & Assessment Initiated',
    body: 'Disaster Command Notice: Floodwaters receded below danger marks. Relief teams deployed for debris clearance and power restoration. You can submit SDRF property damage compensation claims on AapdaSetu.',
    severity: 'info',
    region: 'All Flood Affected Sectors',
  },
]

const CHANNELS = [
  { id: 'web', labelKey: 'cm.channelWeb', icon: Globe },
  { id: 'sms', labelKey: 'cm.channelSms', icon: Smartphone },
  { id: 'whatsapp', labelKey: 'cm.channelWhatsapp', icon: MessageSquare },
]

export default function Communications() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [severity, setSeverity] = useState<AlertSeverity>('critical')
  const [title, setTitle] = useState(PRESETS[0].title)
  const [body, setBody] = useState(PRESETS[0].body)
  const [region, setRegion] = useState(PRESETS[0].region)
  const [channels, setChannels] = useState<string[]>(['web', 'sms'])
  const [recipients, setRecipients] = useState('')
  const [sending, setSending] = useState(false)
  // A mis-click here sends a false evacuation order system-wide — critical
  // broadcasts require an explicit second confirmation step.
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const applyPreset = (p: (typeof PRESETS)[0]) => {
    setTitle(p.title)
    setBody(p.body)
    setSeverity(p.severity)
    setRegion(p.region)
    // Loading a fresh preset must disarm a previously armed confirm state.
    setAwaitingConfirm(false)
    toast(`${t('cm.presetApplied')}: ${t(p.labelKey)}`)
  }

  const toggleChannel = (id: string) => {
    setChannels((curr) =>
      curr.includes(id) ? curr.filter((c) => c !== id) : [...curr, id]
    )
  }

  const send = async () => {
    if (!title.trim() || !body.trim() || channels.length === 0) {
      toast(t('cm.errRequired'), 'error')
      return
    }
    // First press on a critical broadcast arms the confirm step instead of
    // transmitting; the operator must press "Confirm send" to actually fire.
    if (severity === 'critical' && !awaitingConfirm) {
      setAwaitingConfirm(true)
      return
    }
    setAwaitingConfirm(false)
    setSending(true)
    try {
      const result = await broadcastAlert({
        severity,
        title: title.trim(),
        body: body.trim(),
        region: region.trim() || undefined,
        channels,
        recipientNumbers: recipients
          ? recipients.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      })
      // Per-channel honesty: the backend reports each channel's outcome in details[].
      const details = result.details ?? []
      const okCount = details.filter((d) => d.ok).length
      const failedCount = details.filter((d) => d.ok === false).length
      const perChannel = details
        .map((d) => `${d.channel}: ${d.ok ? t('cm.channelOk', 'ok') : d.note || t('cm.channelFailed', 'failed')}`)
        .join(' · ')
      toast(
        `${okCount}/${details.length || result.channels.length} ${t('cm.channelsSucceeded', 'channel(s) succeeded')}` +
          (perChannel ? ` — ${perChannel}` : ''),
        failedCount > 0 ? 'warning' : 'success',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : t('cm.broadcastFailed'), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-red-600 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('cm.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('cm.subtitle')}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 dark:bg-red-950 dark:text-red-300 mono">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
          <span>{t('cm.capReady')}</span>
        </span>
      </div>

      {/* Quick Presets Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>{t('cm.templatesTitle')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.labelKey}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Broadcast Form */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <Field label={t('cm.severityLabel')}>
            <div className="flex gap-2">
              {(['critical', 'warning', 'info'] as AlertSeverity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    severity === s
                      ? s === 'critical'
                        ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                        : s === 'warning'
                        ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                        : 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {s === 'critical' ? t('cm.severityCritical') : s === 'warning' ? t('cm.severityWarning') : t('cm.severityInfo')}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t('cm.headlineLabel')}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('cm.headlinePlaceholder')}
              className="font-bold text-sm"
            />
          </Field>

          <Field label={t('cm.messageLabel')}>
            <Textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('cm.messagePlaceholder')}
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400 mono">
              <span>{t('cm.characters')}: {body.length}</span>
              <span>{t('cm.smsChunks')}: {Math.max(1, Math.ceil(body.length / 160))}</span>
            </div>
          </Field>

          <Field label={t('cm.sectorLabel')}>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={t('cm.sectorPlaceholder')}
            />
          </Field>

          {/* Channels Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono">
              {t('cm.channelsLabel')}
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {CHANNELS.map((c) => {
                const Icon = c.icon
                const active = channels.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChannel(c.id)}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-left transition cursor-pointer ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-4 w-4" />
                      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-400" />}
                    </div>
                    <div className="mt-2 font-bold text-xs">{t(c.labelKey)}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <Field label={t('cm.recipientsLabel')}>
            <Input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="+919876543210, +919876543211"
              className="font-mono text-xs"
            />
          </Field>

          {awaitingConfirm && severity === 'critical' && (
            <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t('cm.confirmCritical', 'You are about to transmit a CRITICAL alert to every citizen channel. Press "Confirm — transmit" again to send, or edit the message.')}
              </span>
            </div>
          )}

          <Button
            variant="danger"
            onClick={send}
            disabled={sending || !title.trim() || !body.trim() || channels.length === 0}
            className="w-full py-3.5 text-sm font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>
              {sending
                ? t('cm.transmitting')
                : awaitingConfirm && severity === 'critical'
                ? t('cm.confirmTransmit', 'Confirm — transmit')
                : t('cm.transmitBroadcast')}
            </span>
          </Button>
        </div>

        {/* Citizen Live Preview Card */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono mb-3 flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" />
              <span>{t('cm.mobilePreview')}</span>
            </div>

            {/* Simulated Mobile Alert Notification */}
            <div className="space-y-3 rounded-2xl border border-slate-300 bg-slate-950 p-4 text-white shadow-xl dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mono">
                <span className="flex items-center gap-1">
                  <Radio className="h-3 w-3 text-red-500 animate-pulse" />
                  <strong>{t('cm.emergencyAlertBadge')}</strong>
                </span>
                <span>{t('cm.now')}</span>
              </div>

              <div className="rounded-xl border border-red-500/50 bg-red-950/60 p-3 text-xs">
                <div className="font-bold text-red-300 text-sm">{title || t('cm.previewTitlePlaceholder')}</div>
                <p className="mt-1.5 text-slate-200 leading-relaxed text-[11px]">{body || t('cm.previewBodyPlaceholder')}</p>
                {region && (
                  <div className="mt-2 text-[10px] text-red-400 font-mono">
                    {t('cm.affectedSector')}: {region}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span>{t('cm.helpline112')}</span>
                <span>{t('cm.icsNetwork')}</span>
              </div>
            </div>

            {/* Channels Dispatch Summary */}
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <div className="font-bold text-slate-800 dark:text-slate-200">{t('cm.activeGateways')}:</div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                {channels.includes('web') && <li>{t('cm.gwWebDesc')}</li>}
                {channels.includes('sms') && <li>{t('cm.gwSmsDesc')}</li>}
                {channels.includes('whatsapp') && <li>{t('cm.gwWhatsappDesc')}</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
