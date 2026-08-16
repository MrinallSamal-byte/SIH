import { useEffect, useRef, useState } from 'react'
import { aiPfaChat } from '../api/ai'
import { createReport } from '../api/endpoints'
import { useToast } from './common/Toast'
import { useLanguage } from '../lib/i18n'
import type { PfaChatMessage } from '../types'

export default function ChatWidget() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [messages, setMessages] = useState<PfaChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [callbackPhones, setCallbackPhones] = useState<Record<number, string>>({})
  const [submittingCallback, setSubmittingCallback] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: 'msg-init',
          role: 'bot',
          content: t('chat.greeting') || 'Hello, I am your AapdaSetu AI Disaster Companion. How can I help you right now?',
        },
      ])
    }
  }, [open, messages.length, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const send = async (customText?: string) => {
    const text = (customText ?? input).trim()
    if (!text || busy) return
    setInput('')
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }])
    setBusy(true)
    try {
      const res = await aiPfaChat(text)
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          content: res.reply,
          exerciseType: res.exerciseType,
          isCritical: res.isCritical,
          helpline: res.helpline || (res.isCritical ? '108' : undefined),
          showCallbackInput: res.isCritical,
        },
      ])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Chatbot unreachable', 'error')
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
      const report = await createReport({
        type: 'other',
        isOneTapSos: true,
        reporterPhone: phone,
        description: `Chatbot Critical Distress Callback: ${userPromptText.slice(0, 120)}`,
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

  if (dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[32rem] w-[min(94vw,25rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm">
                🤖
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold truncate">AapdaSetu AI Assistant</h2>
                <p className="truncate text-[11px] text-blue-100">Disaster Survival, First Aid & PFA</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md p-1 transition hover:bg-white/20"
              aria-label={t('common.close')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
            {messages.map((m, i) => (
              <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : m.isCritical
                      ? 'border border-red-200 bg-red-50/90 text-slate-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-slate-100 rounded-bl-none'
                      : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                  {m.exerciseType && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      🧘 {m.exerciseType.replace(/_/g, ' ')}
                    </div>
                  )}

                  {/* Critical Helpline & Emergency Callback Box */}
                  {m.isCritical && (
                    <div className="mt-3 space-y-2 rounded-xl border border-red-200 bg-white p-3 dark:border-red-900/50 dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                          🚨 Emergency Helpline
                        </span>
                        <a
                          href={`tel:${m.helpline || '108'}`}
                          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm hover:bg-red-700"
                        >
                          📞 Call {m.helpline || '108'}
                        </a>
                      </div>

                      {/* Callback Form */}
                      {!m.callbackSubmitted ? (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Enter mobile number — we will reach you as soon as possible:
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="tel"
                              placeholder="10-digit mobile number"
                              value={callbackPhones[i] || ''}
                              onChange={(e) =>
                                setCallbackPhones((prev) => ({ ...prev, [i]: e.target.value }))
                              }
                              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => handleEmergencyCallback(i, m.content)}
                              disabled={submittingCallback === i}
                              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                            >
                              {submittingCallback === i ? 'Alerting…' : 'Reach Me'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-emerald-50 p-2.5 text-[11px] text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                          <div className="font-bold">✓ Priority Dispatch Alert Created!</div>
                          <div className="mt-0.5">
                            Tracking ID: <strong>{m.trackingId}</strong> ({m.submittedPhone})
                          </div>
                          <a
                            href={`#/track?id=${m.trackingId}`}
                            className="mt-1 inline-block font-bold text-blue-600 underline dark:text-blue-400"
                          >
                            Track Live Response Status →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 italic">
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
                <span>AI Companion is thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Shortcuts */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900 [scrollbar-width:none]">
            {['🌊 Trapped in water', '🩸 Bleeding wound', '🧘 Help me breathe', '❤️ Chest pain', '🏛️ Nearest shelter'].map(
              (prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {prompt}
                </button>
              )
            )}
          </div>

          {/* Input Bar */}
          <div className="flex gap-2 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask disaster guidance or describe situation…"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {t('common.send')}
            </button>
          </div>
        </div>
      )}

      {/* Floating Launcher Button */}
      <div className="flex items-center gap-2">
        {!open && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full bg-white/90 p-1.5 text-xs text-slate-500 shadow-md transition hover:text-slate-800 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-white"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-xl transition hover:scale-105 active:scale-95"
        >
          <span className="text-base">🤖</span>
          <span>{open ? t('common.close') : 'Disaster AI Assistant'}</span>
        </button>
      </div>
    </div>
  )
}
