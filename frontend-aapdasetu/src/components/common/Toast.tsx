/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: number
  message: string
  type: ToastType
  action?: ToastAction
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, options?: { action?: ToastAction }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

// Success/info fade away; errors & warnings persist until manually dismissed
const AUTO_DISMISS_MS = 6000

// A burst of errors must never blanket the screen — oldest toasts are dropped first.
const MAX_VISIBLE_TOASTS = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const clearTimer = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id)
      setToasts((prev) => prev.filter((t) => t.id !== id))
    },
    [clearTimer],
  )

  // Reap orphaned timers no matter how a toast leaves the stack (manual dismiss,
  // stacking-cap eviction, or provider unmount) — prevents timeout leaks.
  useEffect(() => {
    if (timers.current.size === 0) return
    const active = new Set(toasts.map((t) => t.id))
    timers.current.forEach((timer, timerId) => {
      if (!active.has(timerId)) {
        clearTimeout(timer)
        timers.current.delete(timerId)
      }
    })
  }, [toasts])

  // Final safety net when the provider itself unmounts.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'success', options?: { action?: ToastAction }) => {
      const id = ++nextId
      setToasts((prev) => {
        const next = [...prev, { id, message, type, action: options?.action }]
        return next.length > MAX_VISIBLE_TOASTS ? next.slice(next.length - MAX_VISIBLE_TOASTS) : next
      })
      if (type !== 'error' && type !== 'warning') {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, AUTO_DISMISS_MS)
        timers.current.set(id, timer)
      }
    },
    [],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="assertive"
        className="pointer-events-none fixed top-16 left-1/2 z-[9999] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:max-w-md"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-page-enter pointer-events-auto flex items-center rounded-lg py-1.5 pl-4 pr-1 text-sm shadow-lg ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : t.type === 'info'
                ? 'bg-slate-900 font-semibold text-white dark:bg-slate-100 dark:text-slate-900'
                : t.type === 'warning'
                ? 'bg-amber-500 font-semibold text-slate-950'
                : 'bg-red-600 text-white'
            }`}
          >
            <span className="min-w-0 flex-1 py-1.5">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  dismiss(t.id)
                  try {
                    t.action!.onClick()
                  } catch (err) {
                    // A failing action must never break dismissal or bubble into React's handler.
                    console.error('[AapdaSetu Toast] action handler failed:', err)
                  }
                }}
                className="shrink-0 cursor-pointer whitespace-nowrap rounded-md px-1.5 py-1 text-xs font-bold uppercase tracking-wider underline underline-offset-2 transition hover:opacity-70"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="-mr-1 ml-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition hover:bg-black/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
