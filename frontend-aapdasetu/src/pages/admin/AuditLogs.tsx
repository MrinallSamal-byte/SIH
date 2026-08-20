import { useEffect, useState } from 'react'
import { listAuditLogs } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { formatDateTime } from '../../lib/helpers'
import type { AuditLog } from '../../types'

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)

  useEffect(() => {
    listAuditLogs().then(setLogs)
  }, [])

  if (!logs) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Compliance & security audit log</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only record of every admin action, status change, and login event.</p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Admin</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50 dark:bg-slate-800">
                <td className="px-4 py-2 text-xs">{l.adminEmail}</td>
                <td className="px-4 py-2"><Badge value={l.action.toLowerCase()} /></td>
                <td className="px-4 py-2 text-xs">
                  {l.entityType} {l.entityId ? <span className="font-mono">({l.entityId})</span> : ''}
                </td>
                <td className="px-4 py-2 text-xs">{formatDateTime(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="p-6 text-sm text-slate-400 dark:text-slate-500">No audit entries.</div>}
      </div>
    </div>
  )
}
