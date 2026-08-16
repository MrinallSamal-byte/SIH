import type { ReactNode } from 'react'

export default function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`h-full w-full rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-600 dark:bg-slate-900 ${className}`}>
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</h3>}
      {children}
    </div>
  )
}
