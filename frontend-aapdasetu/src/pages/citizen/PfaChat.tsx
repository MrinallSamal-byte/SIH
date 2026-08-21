import { useState, useRef, useEffect } from 'react'
import {
  Bot,
  Send,
  Phone,
  Siren,
  CheckCircle2,
  ArrowRight,
  Activity,
  HeartPulse
} from 'lucide-react'
import { aiPfaChat, cleanAiOutput } from '../../api/ai'
import { createReport } from '../../api/endpoints'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { useGeoLocation } from '../../hooks/useLocation'
import type { PfaChatMessage } from '../../types'

const promptShortcuts = [
  { labelKey: 'pfa.topicFlood', query: 'Water is entering our house rapidly. What are our immediate flood survival actions?' },
  { labelKey: 'pfa.topicBleeding', query: 'How to administer emergency first-aid for severe arterial bleeding?' },
  { labelKey: 'pfa.topicPanic', query: 'I am having intense panic and fear during this disaster. Guide me to calm down.' },
  { labelKey: 'pfa.topicTrapped', query: 'We are trapped under collapsed concrete debris. What should we do to survive and signal rescuers?' },
  { labelKey: 'pfa.topicCardiac', query: 'Someone is having severe chest pain and breathing distress. What should I do immediately?' },
  { labelKey: 'pfa.topicElectrical', query: 'Fallen power lines in standing water. What electrical safety rules should we follow?' },
  { labelKey: 'pfa.topicSnakebite', query: 'Someone was bitten by a snake in flood water. What is the immediate first-aid protocol?' },
  { labelKey: 'pfa.topicFire', query: 'Dense smoke and fire blocking exit. How should we evacuate safely?' },
]

export default function PfaChatPage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const { coords } = useGeoLocation()
  const [messages, setMessages] = useState<PfaChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')
  const [callbackPhones, setCallbackPhones] = useState<Record<number, string>>({})
  const [submittingCallback, setSubmittingCallback] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0 || (prev.length === 1 && prev[0].id === 'pfa-init')) {
        return [
          {
            id: 'pfa-init',
            role: 'bot',
            content:
              t('chat.greeting') ||
              t('pfa.greeting'),
          },
        ]
      }
      return prev
    })
  }, [t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  // Breathing cycle timer
  useEffect(() => {
    if (!breathingActive) return
    const phases: Array<'Inhale' | 'Hold' | 'Exhale'> = ['Inhale', 'Hold', 'Exhale']
    let current = 0
    const interval = setInterval(() => {
      current = (current + 1) % phases.length
      setBreathPhase(phases[current])
    }, 4000)
    return () => clearInterval(interval)
  }, [breathingActive])

  const send = async (customText?: string) => {
    const text = (customText ?? input).trim()
    if (!text || busy) return

    setInput('')
    const updatedMessages: PfaChatMessage[] = [
      ...messages,
      { id: `u-${Date.now()}`, role: 'user', content: text },
    ]
    setMessages(updatedMessages)
    setBusy(true)

    try {
      const res = await aiPfaChat(
        text,
        updatedMessages.map((m) => ({ role: m.role, content: m.content }))
      )
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          content: cleanAiOutput(res.reply),
          exerciseType: res.exerciseType,
          isCritical: res.isCritical,
          dangerLevel: res.dangerLevel || (res.isCritical ? 'CRITICAL' : 'LOW'),
          helpline: res.helpline || (res.isCritical ? '112' : undefined),
          showCallbackInput: res.isCritical || res.dangerLevel === 'MODERATE',
        },
      ])
      if (res.exerciseType?.includes('BREATH') || res.exerciseType?.includes('GROUNDING')) {
        setBreathingActive(true)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : t('chat.unreachable'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleEmergencyCallback = async (msgIndex: number, userPromptText: string) => {
    const phone = (callbackPhones[msgIndex] || '').trim()
    const clean = phone.replace(/\D/g, '')
    if (clean.length < 10) {
      toast(t('common.errPhone10'), 'error')
      return
    }

    setSubmittingCallback(msgIndex)
    try {
      const lat = coords?.latitude ?? 22.5726
      const lng = coords?.longitude ?? 88.3639

      const report = await createReport({
        type: 'other',
        isOneTapSos: true,
        reporterPhone: phone,
        description: `AapdaMitra AI Critical Rescue Request: ${userPromptText.slice(0, 120)}`,
        location: { lat, lng },
        landmark: 'AapdaMitra AI Mental Health & First-Aid Emergency Escalation',
      })

      // Store in local tracking history
      try {
        const existingTracked = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
        if (!existingTracked.includes(report.trackingId)) {
          localStorage.setItem('aapdasetu_tracked_reports', JSON.stringify([report.trackingId, ...existingTracked]))
        }
      } catch {
        // Storage unavailable
      }

      setMessages((prev) =>
        prev.map((m, i) =>
          i === msgIndex
            ? {
                ...m,
                callbackSubmitted: true,
                trackingId: report.trackingId,
                submittedPhone: phone,
              }
            : m
        )
      )

      toast(t('pfa.callbackSent'), 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : t('pfa.callbackFailed'), 'error')
    } finally {
      setSubmittingCallback(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col h-[calc(100vh-7.5rem)] lg:max-w-5xl">
      {/* Top Banner */}
      <div className="flex items-center justify-between rounded-t-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 font-bold text-white shadow-xs dark:bg-slate-100 dark:text-slate-950">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-800 dark:text-slate-300 flex items-center gap-2">
              <span>AapdaMitra AI</span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('pfa.badgeActive')}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('pfa.tagline')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBreathingActive((b) => !b)}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            breathingActive
              ? 'bg-emerald-600 text-white'
              : 'border border-zinc-200/80 bg-[#f4f4f5] text-zinc-600 hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>{breathingActive ? t('pfa.stopCoach') : t('pfa.startCoach')}</span>
        </button>
      </div>

      {/* Breathing Coach Interactive Bar */}
      {breathingActive && (
        <div className="flex items-center justify-center gap-4 border-x border-zinc-200/80 bg-[#f4f4f5] py-3 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 font-bold text-white text-xs dark:bg-slate-100 dark:text-zinc-800 mono">
            {breathPhase === 'Inhale' ? t('pfa.breathIn') : breathPhase === 'Hold' ? t('pfa.breathHold') : t('pfa.breathOut')}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
              {t('pfa.coachTitle')}
            </div>
            <div className="text-sm font-bold text-zinc-800 dark:text-slate-300 mono">
              {breathPhase === 'Inhale' ? t('pfa.phaseInhale') : breathPhase === 'Hold' ? t('pfa.phaseHold') : t('pfa.phaseExhale')} {t('pfa.breathNow')}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 space-y-4 overflow-y-auto border-x border-zinc-200/80 bg-[#f4f4f5] p-4 dark:border-white/[0.08] dark:bg-[#151515]">
        {messages.map((m, i) => (
          <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] lg:max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                m.role === 'user'
                  ? 'bg-zinc-800 text-white rounded-br-none dark:bg-slate-100 dark:text-slate-950 font-medium'
                  : m.dangerLevel === 'CRITICAL' || m.isCritical
                  ? 'border border-red-200 bg-red-50/90 text-zinc-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-slate-300 rounded-bl-none'
                  : m.dangerLevel === 'MODERATE'
                  ? 'border border-amber-200 bg-amber-50/90 text-zinc-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-slate-300 rounded-bl-none'
                  : 'border border-zinc-200/80 bg-white text-zinc-700 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-300 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{cleanAiOutput(m.content)}</div>

              {m.exerciseType && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300 mono">
                  <HeartPulse className="h-3.5 w-3.5" />
                  <span>{m.exerciseType.replace(/_/g, ' ')}</span>
                </div>
              )}

              {/* Danger Level Action Box: Critical or Moderate */}
              {(m.dangerLevel === 'CRITICAL' || m.isCritical || m.dangerLevel === 'MODERATE') && (
                <div className={`mt-3 space-y-3 rounded-xl border p-4 shadow-xs ${
                  m.dangerLevel === 'CRITICAL' || m.isCritical
                    ? 'border-red-300 bg-white dark:border-red-800 dark:bg-[#1a1a1a]'
                    : 'border-amber-300 bg-white dark:border-amber-800 dark:bg-[#1a1a1a]'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5 dark:border-white/[0.08]">
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider mono flex items-center gap-1.5 ${
                        m.dangerLevel === 'CRITICAL' || m.isCritical
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        <Siren className="h-3.5 w-3.5 animate-pulse" />
                        {m.dangerLevel === 'CRITICAL' || m.isCritical ? t('pfa.modeCritical') : t('pfa.modeSupport')}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('pfa.callDesc')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${m.dangerLevel === 'CRITICAL' || m.isCritical ? '112' : '108'}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition ${
                          m.dangerLevel === 'CRITICAL' || m.isCritical
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{t('common.call')} {m.dangerLevel === 'CRITICAL' || m.isCritical ? '112' : '108'}</span>
                      </a>
                    </div>
                  </div>

                  {/* Reach-Out Phone Number Field */}
                  {!m.callbackSubmitted ? (
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 dark:text-slate-200 mb-1.5">
                        {t('pfa.phonePrompt')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          placeholder={t('sos.phonePlaceholder')}
                          value={callbackPhones[i] || ''}
                          onChange={(e) =>
                            setCallbackPhones((prev) => ({ ...prev, [i]: e.target.value }))
                          }
                          className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-red-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleEmergencyCallback(i, m.content)}
                          disabled={submittingCallback === i}
                          className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {submittingCallback === i ? t('pfa.dispatching') : t('pfa.reachMe')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900">
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{t('pfa.dispatchedTitle')}</span>
                      </div>
                      <div className="mt-1 text-zinc-600 dark:text-slate-300">
                        {t('report.trackingIdLabel')} <strong className="font-mono text-zinc-800 dark:text-slate-300">{m.trackingId}</strong> ({t('pfa.contactInfo')} {m.submittedPhone})
                      </div>
                      <a
                        href={`#/track?id=${m.trackingId}`}
                        className="mt-2 inline-flex items-center gap-1 font-bold text-zinc-800 underline hover:text-zinc-600 dark:text-slate-300"
                      >
                        <span>{t('pfa.trackStatusLink')}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic">
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-800 dark:bg-slate-100" />
            <span>{t('pfa.thinking')}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Quick Shortcuts */}
      <div className="border-x border-zinc-200/80 bg-white px-4 py-2.5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {promptShortcuts.map((ps) => (
            <button
              key={ps.labelKey}
              type="button"
              onClick={() => send(ps.query)}
              className="shrink-0 rounded-xl border border-zinc-200/80 bg-[#f4f4f5] px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300"
            >
              {t(ps.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Input */}
      <div className="flex gap-2 rounded-b-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('chat.placeholder')}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:focus:border-slate-500"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={busy || !input.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white"
        >
          <Send className="h-4 w-4" />
          <span>{t('common.send')}</span>
        </button>
      </div>
    </div>
  )
}
