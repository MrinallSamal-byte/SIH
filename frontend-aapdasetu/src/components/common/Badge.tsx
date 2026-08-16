import type { ReactNode } from 'react'

const colors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  full: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  safe: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  need_assistance: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  matched: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
}

export default function Badge({ value, children }: { value?: string; children?: ReactNode }) {
  const text = children ?? value
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[String(text).toLowerCase()] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {text}
    </span>
  )
}
