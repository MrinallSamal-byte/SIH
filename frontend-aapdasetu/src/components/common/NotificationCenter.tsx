import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  CheckCheck,
  X,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Flame,
  Tent,
  Ambulance,
  HeartHandshake,
  Navigation
} from 'lucide-react'
import {
  type NotificationItem,
  loadNotifications,
  saveNotifications,
  SIMULATED_INCOMING_EVENTS,
} from '../../data/mockNotifications'
import { timeAgo } from '../../lib/helpers'
import { useToast } from './Toast'
import { emitRealtimeUpdate } from '../../lib/realtimeEventBus'

interface NotificationCenterProps {
  role?: 'citizen' | 'admin'
  align?: 'left' | 'right'
}

type TabKey = 'all' | 'unread' | 'critical' | 'relief' | 'ops'

export default function NotificationCenter({ role = 'citizen', align = 'right' }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadNotifications(role))
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [, setTick] = useState(0)
  const popoverRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  let toastApi: ReturnType<typeof useToast> | null = null
  try {
    toastApi = useToast()
  } catch {
    // optional outside ToastProvider
  }

  // Update timestamps every 20 seconds
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 20_000)
    return () => window.clearInterval(timer)
  }, [])

  // Sync state to localStorage whenever changed
  useEffect(() => {
    saveNotifications(role, notifications)
  }, [role, notifications])

  // Handle outside click & escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // Automatic realistic incoming simulation for citizen mode after 8 seconds of visiting
  useEffect(() => {
    if (role !== 'citizen') return
    const hasSimulatedKey = 'aapdasetu_has_simulated_v8'
    const alreadyFired = sessionStorage.getItem(hasSimulatedKey)

    if (!alreadyFired) {
      const delay = window.setTimeout(() => {
        simulateIncoming()
        sessionStorage.setItem(hasSimulatedKey, 'true')
      }, 7500)
      return () => window.clearTimeout(delay)
    }
  }, [role])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const hasCritical = useMemo(
    () => notifications.some((n) => !n.read && n.severity === 'critical'),
    [notifications]
  )

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'unread') return !item.read
      if (activeTab === 'critical') return item.severity === 'critical'
      if (activeTab === 'relief') {
        return item.category === 'shelter' || item.category === 'supplies' || item.category === 'medical' || item.category === 'reunion'
      }
      if (activeTab === 'ops') {
        return item.category === 'dispatch' || item.category === 'evacuation' || item.category === 'ops'
      }
      return true
    })
  }, [notifications, activeTab])

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const simulateIncoming = () => {
    const pool = SIMULATED_INCOMING_EVENTS
    const event = pool[Math.floor(Math.random() * pool.length)]
    const newNotif: NotificationItem = {
      ...event,
      id: `notif-sim-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    }

    setNotifications((prev) => [newNotif, ...prev])
    emitRealtimeUpdate('alert_created', newNotif.id, newNotif)

    if (toastApi) {
      toastApi.toast(
        `🚨 ${newNotif.title}`,
        newNotif.severity === 'critical' ? 'error' : newNotif.severity === 'warning' ? 'warning' : 'info',
        {
          action: {
            label: 'View',
            onClick: () => {
              setOpen(true)
              if (newNotif.actionUrl) navigate(newNotif.actionUrl)
            },
          },
        }
      )
    }
  }

  const getCategoryIcon = (category: NotificationItem['category'], severity: NotificationItem['severity']) => {
    switch (category) {
      case 'evacuation':
        return <Flame className="h-4 w-4 text-red-500" />
      case 'dispatch':
        return <Ambulance className="h-4 w-4 text-amber-500" />
      case 'shelter':
        return <Tent className="h-4 w-4 text-blue-500" />
      case 'reunion':
        return <HeartHandshake className="h-4 w-4 text-emerald-500" />
      case 'medical':
        return <Ambulance className="h-4 w-4 text-rose-500" />
      case 'infrastructure':
        return <Navigation className="h-4 w-4 text-indigo-500" />
      default:
        if (severity === 'critical') return <ShieldAlert className="h-4 w-4 text-red-500" />
        if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-zinc-200/80 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] dark:hover:text-slate-200 cursor-pointer shadow-xs"
        aria-label="Emergency Notifications"
        title="Emergency Notifications"
      >
        <Bell className="h-5 w-5" />

        {/* Dynamic Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white shadow-md">
            {hasCritical && (
              <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-red-400 opacity-60" />
            )}
            <span className="relative z-10">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Popover Dropdown Drawer */}
      {open && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } top-full z-50 mt-2 w-[22rem] sm:w-[26rem] md:w-[28rem] rounded-2xl border border-zinc-200/90 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#181818] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150`}
        >
          {/* Popover Header */}
          <div className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3.5 dark:border-white/[0.06] dark:bg-[#202020]/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-slate-100">
                    {role === 'admin' ? 'Tactical Ops Feed' : 'Live Emergency Alerts'}
                  </h3>
                  <p className="text-[10px] font-medium text-zinc-500 dark:text-slate-400">
                    National Crisis & Response Stream
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-zinc-500 transition hover:bg-zinc-200/60 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-800 dark:hover:text-slate-200 cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex flex-wrap gap-1 border-t border-zinc-200/50 pt-2.5 dark:border-white/[0.06]">
              {(
                [
                  { id: 'all', label: 'All', count: notifications.length },
                  { id: 'unread', label: 'Unread', count: unreadCount },
                  {
                    id: 'critical',
                    label: 'Critical',
                    count: notifications.filter((n) => n.severity === 'critical').length,
                  },
                  {
                    id: 'relief',
                    label: role === 'admin' ? 'Shelter & Fleet' : 'Relief & Food',
                    count: notifications.filter((n) => n.category === 'shelter' || n.category === 'supplies' || n.category === 'medical' || n.category === 'reunion').length,
                  },
                  {
                    id: 'ops',
                    label: 'Dispatches',
                    count: notifications.filter((n) => n.category === 'dispatch' || n.category === 'evacuation' || n.category === 'ops').length,
                  },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as TabKey)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900 font-bold'
                        : 'bg-white/80 text-zinc-600 hover:bg-zinc-200/60 dark:bg-[#252525] dark:text-slate-300 dark:hover:bg-[#303030]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && tab.count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                          isActive
                            ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[26rem] divide-y divide-zinc-100 overflow-y-auto dark:divide-white/[0.06]">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-xs font-bold text-zinc-800 dark:text-slate-200">All clear in this section</p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-slate-400">
                  No alerts match the selected filter category.
                </p>
              </div>
            ) : (
              filtered.map((item) => {
                const isCritical = item.severity === 'critical'
                const isWarning = item.severity === 'warning'
                const isSuccess = item.severity === 'success'

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleRead(item.id)}
                    className={`group relative p-4 transition cursor-pointer ${
                      !item.read
                        ? 'bg-red-50/30 hover:bg-red-50/60 dark:bg-red-950/15 dark:hover:bg-red-950/25'
                        : 'hover:bg-zinc-50 dark:hover:bg-[#222222]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon Badge */}
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                          isCritical
                            ? 'border-red-200 bg-red-100/70 text-red-600 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-400'
                            : isWarning
                            ? 'border-amber-200 bg-amber-100/70 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-400'
                            : isSuccess
                            ? 'border-emerald-200 bg-emerald-100/70 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'border-blue-200 bg-blue-100/70 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                      >
                        {getCategoryIcon(item.category, item.severity)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                isCritical
                                  ? 'bg-red-600 text-white'
                                  : isWarning
                                  ? 'bg-amber-500 text-white'
                                  : isSuccess
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {item.severity}
                            </span>
                            {!item.read && (
                              <span className="flex h-2 w-2 rounded-full bg-red-600" title="Unread" />
                            )}
                          </div>

                          <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-slate-500 mono">
                            <Clock className="h-3 w-3" />
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>

                        <h4
                          className={`text-xs leading-snug ${
                            !item.read
                              ? 'font-extrabold text-zinc-900 dark:text-slate-100'
                              : 'font-semibold text-zinc-700 dark:text-slate-300'
                          }`}
                        >
                          {item.title}
                        </h4>

                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-slate-400 line-clamp-3">
                          {item.message}
                        </p>

                        {/* Sector Location Badge */}
                        {item.targetArea && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-slate-400">
                            <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                            <span className="truncate font-medium">{item.targetArea}</span>
                          </div>
                        )}

                        {/* Action Link Button */}
                        {item.actionUrl && (
                          <div className="mt-2.5 flex items-center justify-between pt-1">
                            <Link
                              to={item.actionUrl}
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpen(false)
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            >
                              <span>{item.actionLabel || 'View Details'}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => dismiss(item.id, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300 text-[10px] font-semibold flex items-center gap-0.5"
                              title="Dismiss"
                            >
                              <X className="h-3 w-3" />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-4 py-2.5 dark:border-white/[0.06] dark:bg-[#202020]/90">
            {role === 'citizen' ? (
              <Link
                to="/alerts"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 hover:text-zinc-900 dark:text-slate-300 dark:hover:text-white"
              >
                <span>Live Bulletins Page</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                to="/admin/live-sos"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 hover:text-zinc-900 dark:text-slate-300 dark:hover:text-white"
              >
                <span>Live SOS Dispatch Console</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}

            {/* Quick Demo Test Simulation Button */}
            <button
              type="button"
              onClick={simulateIncoming}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-zinc-600 shadow-2xs hover:bg-zinc-100 dark:border-white/[0.1] dark:bg-[#2a2a2a] dark:text-slate-300 dark:hover:bg-[#353535] cursor-pointer"
              title="Simulate incoming real-time emergency broadcast"
            >
              <Sparkles className="h-3 w-3 text-amber-500 animate-spin-slow" />
              <span>Simulate Alert</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
