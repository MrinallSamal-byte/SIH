import { useState, useRef, useEffect } from 'react'
import { aiPfaChat } from '../../api/ai'
import { createReport } from '../../api/endpoints'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { getCurrentPosition } from '../../lib/helpers'
import type { PfaChatMessage } from '../../types'

const promptShortcuts = [
  '🌊 Water entering house / Flooding',
  '🩸 First aid for severe bleeding',
  '🧘 Panic / Help me calm down',
  '🏚️ Trapped under debris / collapse',
  '❤️ Chest pain / Heart attack advice',
  '⚡ Electric hazard & flood safety',
  '🐍 Snakebite emergency protocol',
  '🔥 Fire evacuation tactics',
]

export default function PfaChatPage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [messages, setMessages] = useState<PfaChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')
  const [callbackPhones, setCallbackPhones] = useState<Record<number, string>>({})
  const [submittingCallback, setSubmittingCallback] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'pfa-init',
          role: 'bot',
          content:
            t('chat.greeting') ||
            'Namaste! I am AapdaMitra AI (आपदामित्र), your 24/7 intelligent disaster survival, triage, and crisis companion. How can I help you and your family right now?',
        },
      ])
    }
  }, [messages.length, t])

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
          content: res.reply,
          exerciseType: res.exerciseType,
          isCritical: res.isCritical,
          helpline: res.helpline || (res.isCritical ? '108' : undefined),
          showCallbackInput: res.isCritical,
        },
      ])
      if (res.exerciseType?.includes('BREATH') || res.exerciseType?.includes('GROUNDING')) {
        setBreathingActive(true)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AapdaMitra AI unreachable', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleEmergencyCallback = async (msgIndex: number, userPromptText: string) => {
    const phone = (callbackPhones[msgIndex] || '').trim()
    const clean = phone.replace(/\D/g, '')
    if (clean.length < 10) {
      toast('Please enter a valid 10-digit mobile number', 'error')
      return
    }

    setSubmittingCallback(msgIndex)
    try {
      let lat = 22.5726
      let lng = 88.3639
      try {
        const pos = await getCurrentPosition(false, 3000)
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch {}

      const report = await createReport({
        type: 'other',
        isOneTapSos: true,
        reporterPhone: phone,
        description: `AapdaMitra AI Critical Rescue Request: ${userPromptText.slice(0, 120)}`,
        location: { lat, lng },
        landmark: 'AapdaMitra AI Mental Health & First-Aid Emergency Escalation',
      })

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

      toast('Urgent rescue callback requested! Responders notified.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to request callback', 'error')
    } finally {
      setSubmittingCallback(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col h-[calc(100vh-7.5rem)]">
      {/* Top Banner */}
      <div className="flex items-center justify-between rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white text-lg shadow-xs">
            🤖
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>AapdaMitra AI</span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                24/7 Active
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              24/7 intelligent disaster survival guidance, emergency first-aid & trauma support.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBreathingActive((b) => !b)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            breathingActive
              ? 'bg-emerald-600 text-white'
              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {breathingActive ? 'Stop Breath Coach' : '🧘 4-4-4 Box Breathing'}
        </button>
      </div>

      {/* Breathing Coach Interactive Bar */}
      {breathingActive && (
        <div className="flex items-center justify-center gap-4 border-x border-slate-200 bg-slate-100 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 font-bold text-white text-xs dark:bg-slate-100 dark:text-slate-900">
            {breathPhase === 'Inhale' ? 'IN' : breathPhase === 'Hold' ? 'HOLD' : 'OUT'}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Guided 4-Second Box Breathing
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {breathPhase.toUpperCase()} NOW
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 space-y-4 overflow-y-auto border-x border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        {messages.map((m, i) => (
          <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : m.isCritical
                  ? 'border border-red-200 bg-red-50/90 text-slate-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-slate-100 rounded-bl-none'
                  : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

              {m.exerciseType && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  🧘 {m.exerciseType.replace(/_/g, ' ')}
                </div>
              )}

              {/* Critical Situation Action Box */}
              {m.isCritical && (
                <div className="mt-3 space-y-3 rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-slate-900 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Emergency Helpline
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Direct toll-free connection to medical & rescue ambulance dispatch
                      </p>
                    </div>
                    <a
                      href={`tel:${m.helpline || '108'}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700"
                    >
                      Call {m.helpline || '108'}
                    </a>
                  </div>

                  {/* Reach-Out Phone Number Field */}
                  {!m.callbackSubmitted ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Enter your mobile number — rescue teams will reach out to you as soon as possible:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          placeholder="Enter 10-digit mobile number"
                          value={callbackPhones[i] || ''}
                          onChange={(e) =>
                            setCallbackPhones((prev) => ({ ...prev, [i]: e.target.value }))
                          }
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => handleEmergencyCallback(i, m.content)}
                          disabled={submittingCallback === i}
                          className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {submittingCallback === i ? 'Dispatching…' : 'Reach Me Out'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900">
                      <div className="font-bold text-sm">✓ Urgent Priority Rescue Callback Dispatched!</div>
                      <div className="mt-1 text-slate-700 dark:text-slate-300">
                        Tracking ID: <strong className="font-mono text-slate-900 dark:text-slate-100">{m.trackingId}</strong> (Contact: {m.submittedPhone})
                      </div>
                      <a
                        href={`#/track?id=${m.trackingId}`}
                        className="mt-2 inline-flex items-center gap-1 font-bold text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                      >
                        <span>Track Live Incident Response Status</span>
                        <span>→</span>
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
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
            <span>Preparing response…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Quick Shortcuts */}
      <div className="border-x border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {promptShortcuts.map((ps) => (
            <button
              key={ps}
              type="button"
              onClick={() => send(ps)}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {ps}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Input */}
      <div className="flex gap-2 rounded-b-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Describe your situation (e.g. 'water rising fast', 'someone is bleeding', 'feeling anxious')…"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
