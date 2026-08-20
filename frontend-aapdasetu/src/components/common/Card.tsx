import type { ReactNode } from 'react'

export default function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`h-full w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-zinc-950 dark:text-slate-100 ${className}`}>
      {title && <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>}
      {children}
    </div>
  )
}

