import type { ReactNode } from 'react'

type DotColor = 'red' | 'amber' | 'emerald' | 'zinc'

interface BadgeConfig {
  pillClass: string
  dotColor?: DotColor
}

const BADGE_MAP: Record<string, BadgeConfig> = {
  critical: {
    pillClass: 'bg-red-50/80 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
    dotColor: 'red',
  },
  need_assistance: {
    pillClass: 'bg-red-50/80 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
    dotColor: 'red',
  },
  flagged_fraud: {
    pillClass: 'bg-red-50/80 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
    dotColor: 'red',
  },
  flagged_fraud_risk: {
    pillClass: 'bg-red-50/80 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
    dotColor: 'red',
  },
  warning: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'amber',
  },
  in_progress: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'amber',
  },
  on_duty: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'amber',
  },
  full: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'amber',
  },
  open: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'emerald',
  },
  safe: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'emerald',
  },
  matched: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'emerald',
  },
  resolved: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'emerald',
  },
  verified_valid: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'emerald',
  },
  available: {
    pillClass: 'bg-zinc-100/90 text-zinc-800 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700',
    dotColor: 'emerald',
  },
}

const DEFAULT_CONFIG: BadgeConfig = {
  pillClass: 'bg-zinc-100/90 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700',
  dotColor: 'zinc',
}

export default function Badge({ value, children, label }: { value?: string; children?: ReactNode; label?: ReactNode }) {
  const text = label ?? children ?? value
  const key = String(value ?? children ?? text).toLowerCase().trim()
  const cfg = BADGE_MAP[key] ?? DEFAULT_CONFIG

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold mono tracking-tight ${cfg.pillClass}`}
    >
      {cfg.dotColor === 'red' && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
      {cfg.dotColor === 'amber' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {cfg.dotColor === 'emerald' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {cfg.dotColor === 'zinc' && <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />}
      <span>{text}</span>
    </span>
  )
}
