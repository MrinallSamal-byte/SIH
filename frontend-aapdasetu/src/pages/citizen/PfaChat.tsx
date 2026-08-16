import { useState, useRef, useEffect } from 'react'
import { aiPfaChat } from '../../api/ai'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import type { PfaChatMessage } from '../../types'

const promptShortcuts = [
  'I feel panicked and scared',
  'Water is entering our house',
  'Need help calming down my family',
  'Breathing exercise guide',
]

export default function PfaChatPage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [messages, setMessages] = useState<PfaChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'bot',
          content: t('chat.greeting') ||
            'Hello, I am your AapdaSetu emergency companion. I am here with you while rescue is en route. How are you feeling right now?',
        },
      ])
    }
  }, [messages.length, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setBusy(true)

    try {
      const res = await aiPfaChat(text)
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: res.reply, exerciseType: res.exerciseType },
      ])
      if (res.exerciseType?.includes('breath')) {
        setBreathingActive(true)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AI Companion unreachable', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg dark:bg-blue-950">
            🧘
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              AI Psychological First Aid & Companion
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calm grounding, trauma relief & emergency guidance while responders arrive.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBreathingActive((b) => !b)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            breathingActive
              ? 'bg-emerald-600 text-white'
              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {breathingActive ? 'Stop Breath Coach' : '🌬️ 4-4-4 Breath Coach'}
        </button>
      </div>

      {/* Breathing Guide Banner */}
      {breathingActive && (
        <div className="flex items-center justify-center gap-4 border-x border-slate-200 bg-blue-50 py-3 dark:border-slate-800 dark:bg-blue-950/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold text-white shadow-md animate-pulse">
            {breathPhase === 'Inhale' ? '⬆️' : breathPhase === 'Hold' ? '⏸️' : '⬇️'}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Guided 4-Second Breathing
            </div>
            <div className="text-lg font-black text-blue-700 dark:text-blue-200">
              {breathPhase.toUpperCase()} NOW...
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto border-x border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
              }`}
            >
              {m.content}
              {m.exerciseType && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  🧘 {m.exerciseType.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-slate-400 dark:text-slate-500 italic">Companion is typing…</div>}
        <div ref={bottomRef} />
      </div>

      {/* Shortcuts */}
      <div className="border-x border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {promptShortcuts.map((ps) => (
            <button
              key={ps}
              type="button"
              onClick={() => send(ps)}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {ps}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2 rounded-b-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Share what is on your mind or how you feel…"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
