import type { ReactNode } from 'react'

const colors: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  critical: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  open: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  full: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  safe: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  need_assistance: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  matched: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  resolved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export default function Badge({ value, children }: { value?: string; children?: ReactNode }) {
  const text = children ?? value
  const key = String(text).toLowerCase()
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
        colors[key] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {text}
    </span>
  )
}

