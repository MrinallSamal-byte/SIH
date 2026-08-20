import type { ReactNode } from 'react'

const colors: Record<string, string> = {
  info: 'bg-slate-100 text-slate-800 border border-slate-200 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300',
  critical: 'bg-red-50 text-red-800 border border-red-200 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300',
  open: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300',
  full: 'bg-amber-50 text-amber-800 border border-amber-200 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300',
  closed: 'bg-slate-100 text-slate-600 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400',
  safe: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300',
  need_assistance: 'bg-red-50 text-red-800 border border-red-200 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300',
  matched: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300',
  resolved: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300',
  in_progress: 'bg-amber-50 text-amber-800 border border-amber-200 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300',
  pending: 'bg-slate-100 text-slate-700 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300',
  verified_valid: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300',
  flagged_fraud_risk: 'bg-red-50 text-red-800 border border-red-200 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300',
}

export default function Badge({ value, children }: { value?: string; children?: ReactNode }) {
  const text = children ?? value
  const key = String(text).toLowerCase()
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
        colors[key] ?? 'bg-slate-100 text-slate-700 border border-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {text}
    </span>
  )
}
