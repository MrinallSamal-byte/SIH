import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

const base = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className ?? ''}`} />
}
