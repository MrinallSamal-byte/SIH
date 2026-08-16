import { useEffect, useState } from 'react'
import { listAgencies } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import type { Agency } from '../../types'

export default function Agencies() {
  const [agencies, setAgencies] = useState<Agency[] | null>(null)

  useEffect(() => {
    listAgencies().then(setAgencies)
  }, [])

  if (!agencies) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Multi-agency response roster</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">NDRF, fire, police, hospitals, and NGOs with jurisdiction.</p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Agency</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Jurisdiction</th>
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50 dark:bg-slate-900">
                <td className="px-4 py-2 font-medium">{a.name}</td>
                <td className="px-4 py-2"><Badge value={a.type} /></td>
                <td className="px-4 py-2 text-xs">{a.contactPhone ?? a.contactEmail ?? '—'}</td>
                <td className="px-4 py-2 text-xs">{a.jurisdiction ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
