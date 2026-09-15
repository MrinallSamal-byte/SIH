import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

export default function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useLanguage()
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-white/[0.08] dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/[0.06]">
          <h2 id={titleId} className="text-base font-bold text-zinc-900 dark:text-slate-100">{title}</h2>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-[#252525] dark:hover:text-slate-200 cursor-pointer transition-colors"
            onClick={onClose}
            aria-label={t('common.closeDialog')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
