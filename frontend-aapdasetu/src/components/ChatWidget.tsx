import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Phone,
  Siren,
  CheckCircle2,
  X,
  AlertTriangle,
  Send
} from 'lucide-react'
import { aiPfaChat, cleanAiOutput } from '../api/ai'
import { createReport } from '../api/endpoints'
import { useToast } from './common/Toast'
import { useLanguage } from '../lib/i18n'
import { getCurrentPosition } from '../lib/helpers'
import type { PfaChatMessage } from '../types'

export function openChatWidget() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-aapdasetu-chat'))
  }
}

export default function ChatWidget() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<PfaChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [callbackPhones, setCallbackPhones] = useState<Record<number, string>>({})
  const [submittingCallback, setSubmittingCallback] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener('open-aapdasetu-chat', handleOpen)
    return () => window.removeEventListener('open-aapdasetu-chat', handleOpen)
  }, [])

  useEffect(() => {
    if (open && (messages.length === 0 || (messages.length === 1 && messages[0].id === 'msg-init'))) {
      setMessages([
        {
          id: 'msg-init',
          role: 'bot',
          content: t('chat.greeting') || 'Namaste! I am AapdaMitra AI. Tell me what emergency, injury, or safety assistance you need.',
        },
      ])
    }
  }, [open, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const send = async (customText?: string) => {
    const text = (customText ?? input).trim()
    if (!text || busy) return
    setInput('')
    const updatedMessages: PfaChatMessage[] = [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user', content: text },
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
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: cleanAiOutput(res.reply),
          exerciseType: res.exerciseType,
          isCritical: res.isCritical,
          dangerLevel: res.dangerLevel || (res.isCritical ? 'CRITICAL' : 'LOW'),
          helpline: res.helpline || (res.isCritical ? '112' : undefined),
          showCallbackInput: res.isCritical || res.dangerLevel === 'MODERATE',
        },
      ])
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
        description: `AapdaMitra AI Priority Callback Dispatch: ${userPromptText.slice(0, 120)}`,
        location: { lat, lng },
      })

      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === msgIndex
            ? {
                ...msg,
                callbackSubmitted: true,
                submittedPhone: phone,
                trackingId: report.trackingId,
              }
            : msg
        )
      )

      toast('Emergency callback requested! Rescue team notified.')
    } catch {
      toast('Failed to dispatch callback request', 'error')
    } finally {
      setSubmittingCallback(null)
    }
  }

  return (
    <aside
      aria-label="AapdaMitra AI Assistant"
      className="fixed bottom-20 right-4 sm:bottom-20 sm:right-6 md:bottom-6 md:right-6 z-50"
    >
      {/* Circular Floating Toggle Button */}
      {!open && (
        <div className="relative group">
          {/* Ambient Glowing Aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-orange-500 opacity-70 blur-md transition-all duration-300 group-hover:opacity-100 group-hover:blur-lg animate-pulse" />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open AapdaMitra AI assistant"
            title="Ask AapdaMitra AI"
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 text-white shadow-xl shadow-orange-500/30 ring-2 ring-white/70 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer dark:ring-slate-900/80"
          >
            <Bot className="h-7 w-7 text-white drop-shadow-md transition-transform duration-300 group-hover:rotate-6" />

            {/* Live Indicator Ping Dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </span>
          </button>
        </div>
      )}

      {/* Floating Chat Modal */}
      {open && (
        <div
          role="dialog"
          aria-label="AapdaMitra AI Disaster Support"
          className="flex h-[520px] max-h-[calc(100vh-110px)] w-[calc(100vw-28px)] sm:w-[380px] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs">AapdaMitra AI</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 flex items-center gap-1 mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE ASSIST
                  </span>
                </div>
                <p className="truncate text-[10px] text-slate-400">Rapid 24/7 Disaster Survival Guidance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
            {messages.map((m, i) => {
              const isCrit = m.dangerLevel === 'CRITICAL' || m.isCritical
              const isMod = m.dangerLevel === 'MODERATE'

              return (
                <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                      m.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-none dark:bg-slate-100 dark:text-slate-950'
                        : isCrit
                        ? 'border border-red-200 bg-red-50/90 text-slate-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-slate-100 rounded-bl-none'
                        : isMod
                        ? 'border border-amber-200 bg-amber-50/90 text-slate-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-slate-100 rounded-bl-none'
                        : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 rounded-bl-none'
                    }`}
                  >
                    {/* Message Body */}
                    <div className="whitespace-pre-wrap leading-relaxed">{cleanAiOutput(m.content)}</div>

                    {m.exerciseType && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300 mono">
                        {m.exerciseType.replace(/_/g, ' ')}
                      </div>
                    )}

                    {/* DANGER LEVEL ACTION CARD: Critical or Moderate */}
                    {(isCrit || isMod) && (
                      <div className={`mt-3 space-y-2.5 rounded-xl border p-3 ${
                        isCrit
                          ? 'border-red-300 bg-white dark:border-red-800 dark:bg-slate-900'
                          : 'border-amber-300 bg-white dark:border-amber-800 dark:bg-slate-900'
                      }`}>
                        {/* Emergency Hotline Buttons */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider mono flex items-center gap-1 ${
                            isCrit ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            {isCrit ? <Siren className="h-3.5 w-3.5 animate-pulse" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            {isCrit ? 'Critical Emergency' : 'Assistance Hotline'}
                          </span>

                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${isCrit ? '112' : '108'}`}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold text-white shadow-xs ${
                                isCrit ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                              }`}
                            >
                              <Phone className="h-3 w-3" />
                              <span>Call {isCrit ? '112' : '108'}</span>
                            </a>
                            {isCrit && (
                              <a
                                href="tel:108"
                                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-slate-700"
                              >
                                <span>108</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Immediate Rescue Team Callback Input */}
                        {!m.callbackSubmitted ? (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                              {isCrit
                                ? 'Enter phone number — Rescue team will call & dispatch:'
                                : 'Enter phone number for relief volunteer callback:'}
                            </label>
                            <div className="flex gap-1.5">
                              <input
                                type="tel"
                                value={callbackPhones[i] || ''}
                                onChange={(e) =>
                                  setCallbackPhones((prev) => ({ ...prev, [i]: e.target.value }))
                                }
                                placeholder="10-digit mobile number"
                                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-red-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleEmergencyCallback(i, messages[i - 1]?.content || m.content)}
                                disabled={submittingCallback === i}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50 ${
                                  isCrit ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                              >
                                {submittingCallback === i ? 'Dispatching…' : 'Request Help'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>
                              Emergency SOS dispatched! Rescue team notified to call {m.submittedPhone} (Ref: {m.trackingId})
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 font-medium">AapdaMitra AI formulating safety guidance…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompts */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
            {[
              { label: 'Water rising', text: 'Flood water is entering the building fast' },
              { label: 'Severe wound', text: 'Someone has deep bleeding wound' },
              { label: 'Trapped under debris', text: 'Help, someone is trapped under collapsed wall' },
              { label: 'Safe evacuation', text: 'Where is the nearest safe shelter route?' },
            ].map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => send(qp.text)}
                disabled={busy}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              disabled={busy}
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </aside>
  )
}
