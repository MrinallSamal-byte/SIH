import type { PriorityLabel } from '../../types'

const styles: Record<PriorityLabel, string> = {
  RED: 'bg-red-600 text-white shadow-xs',
  YELLOW: 'bg-amber-500 text-slate-950 font-bold',
  GREEN: 'bg-emerald-600 text-white',
}

export default function PriorityBadge({ label }: { label: PriorityLabel }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${styles[label]}`}>
      {label}
    </span>
  )
}

