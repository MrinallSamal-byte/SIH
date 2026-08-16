import { useEffect, useRef, useState } from 'react'
import { aiPfaChat } from '../api/ai'
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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'bot', content: t('chat.greeting') }])
    }
  }, [open, messages.length, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setBusy(true)
    try {
      const res = await aiPfaChat(text)
      setMessages((prev) => [...prev, { role: 'bot', content: res.reply, exerciseType: res.exerciseType }])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Chatbot unreachable', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 bg-blue-600 px-4 py-3 text-white">
            <div className="min-w-0">
              <h2 className="text-sm font-bold">{t('chat.title')}</h2>
              <p className="truncate text-[11px] text-blue-100">{t('chat.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md p-1 transition hover:bg-blue-500"
              aria-label={t('common.close')}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {m.content}
                  {m.exerciseType && (
                    <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      🧘 {m.exerciseType.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-slate-400 dark:text-slate-500">typing…</div>}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('chat.placeholder')}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {t('common.send')}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!open && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full bg-white/90 p-1.5 text-xs text-slate-500 shadow-md transition hover:text-slate-800 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-white"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2C6.14 2 3 5.03 3 8.75c0 2.1 1.07 3.95 2.73 5.16-.05.98-.48 2.01-1.22 2.9-.14.16-.04.41.16.44 1.76.27 3.16-.62 3.78-1.41.46.11.95.16 1.55.16 3.86 0 7-3.03 7-6.75S13.86 2 10 2Z" />
          </svg>
          {open ? t('common.close') : t('chat.suggestion')}
        </button>
      </div>
    </div>
  )
}
