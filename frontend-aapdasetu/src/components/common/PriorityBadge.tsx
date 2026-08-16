import type { PriorityLabel } from '../../types'

const colors: Record<PriorityLabel, string> = {
  RED: 'bg-red-600 text-white',
  YELLOW: 'bg-amber-500 text-white',
  GREEN: 'bg-emerald-600 text-white',
}

export default function PriorityBadge({ label }: { label: PriorityLabel }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colors[label]}`}>
      {label}
    </span>
  )
}
