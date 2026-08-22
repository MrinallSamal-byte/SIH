import {
  createDamageAssessment,
  createMissingPerson,
  createReport,
  createSafetyCheckin,
} from '../api/endpoints'

/**
 * Global offline submission outbox. Every citizen write (SOS, reports, etc.)
 * that fails because the network/backend is unavailable lands here and is
 * replayed automatically on reconnect (window 'online'), on app launch, or
 * when the service worker nudges us after a Background Sync event.
 */

export type OutboxKind =
  | 'sos'
  | 'report'
  | 'missing_person'
  | 'damage_assessment'
  | 'safety_checkin'

export interface OutboxItem {
  id: string
  kind: OutboxKind
  payload: unknown
  createdAt: number
  attempts: number
}

export interface FlushResult {
  synced: number
  failed: number
}

const OUTBOX_KEY = 'aapdasetu_outbox_v1'
const LEGACY_SOS_KEY = 'aapdasetu_pending_sos'
const MAX_ATTEMPTS = 5

function readOutbox(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is OutboxItem =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as OutboxItem).id === 'string' &&
        typeof (item as OutboxItem).kind === 'string',
    )
  } catch {
    return []
  }
}

function writeOutbox(items: OutboxItem[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
  } catch {
    // Storage blocked/full (private mode) — queue is best-effort only
  }
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // fall through to manual id
  }
  return `outbox-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Queue a payload for later submission. Returns the generated item id. */
export function enqueueOutbox(kind: OutboxKind, payload: unknown): string {
  const id = newId()
  const items = readOutbox()
  items.push({ id, kind, payload, createdAt: Date.now(), attempts: 0 })
  writeOutbox(items)
  return id
}

export function getOutbox(): OutboxItem[] {
  return readOutbox()
}

export function removeFromOutbox(id: string): void {
  writeOutbox(readOutbox().filter((item) => item.id !== id))
}

function replayItem(item: OutboxItem): Promise<unknown> {
  switch (item.kind) {
    case 'sos':
    case 'report':
      return createReport(item.payload as Parameters<typeof createReport>[0])
    case 'missing_person':
      return createMissingPerson(item.payload as Parameters<typeof createMissingPerson>[0])
    case 'damage_assessment':
      return createDamageAssessment(item.payload as Parameters<typeof createDamageAssessment>[0])
    case 'safety_checkin':
      return createSafetyCheckin(item.payload as Parameters<typeof createSafetyCheckin>[0])
    default:
      return Promise.reject(new Error(`Unknown outbox kind: ${String(item.kind)}`))
  }
}

// Single-flight lock so mount/online/SW nudges never double-submit an SOS.
let flushing: Promise<FlushResult> | null = null

async function runFlush(): Promise<FlushResult> {
  try {
    // Never burn retry attempts while provably offline.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { synced: 0, failed: 0 }
    }
    let synced = 0
    let failed = 0
    for (const item of readOutbox()) {
      if (item.attempts >= MAX_ATTEMPTS) continue // poison-pill guard: left queued, no longer retried
      try {
        await replayItem(item)
        removeFromOutbox(item.id)
        synced++
      } catch {
        failed++
        writeOutbox(
          readOutbox().map((i) => (i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i)),
        )
      }
    }
    return { synced, failed }
  } catch {
    return { synced: 0, failed: 0 }
  }
}

/** Replay queued submissions through the real endpoints. Never throws. */
export function flushOutbox(): Promise<FlushResult> {
  if (!flushing) {
    flushing = runFlush().finally(() => {
      flushing = null
    })
  }
  return flushing
}

/** One-time migration of the old SOS-page-only queue into the global outbox. */
function migrateLegacySosQueue(): void {
  try {
    const raw = localStorage.getItem(LEGACY_SOS_KEY)
    if (!raw) return
    localStorage.removeItem(LEGACY_SOS_KEY)
    const parsed = JSON.parse(raw) as unknown
    const queue = Array.isArray(parsed) ? parsed : [parsed]
    for (const payload of queue) {
      if (payload && typeof payload === 'object') enqueueOutbox('sos', payload)
    }
  } catch {
    try {
      localStorage.removeItem(LEGACY_SOS_KEY)
    } catch {
      // ignore
    }
  }
}

let cleanupSync: (() => void) | null = null
let consumers = 0

/**
 * Arms global outbox syncing: migrates legacy data, flushes immediately, then
 * re-flushes on window 'online' and on the service worker's OUTBOX_FLUSH nudge
 * (Background Sync). Idempotent and refcounted — multiple pages/layouts may
 * subscribe; listeners stay armed until the LAST consumer cleans up (so one
 * page unmounting can never disarm syncing for the rest of the app).
 */
export function initGlobalOutboxSync(): () => void {
  if (!cleanupSync) {
    migrateLegacySosQueue()
    void flushOutbox()

    const handleOnline = () => {
      void flushOutbox()
    }
    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined
    const handleMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'OUTBOX_FLUSH') {
        void flushOutbox()
      }
    }

    window.addEventListener('online', handleOnline)
    sw?.addEventListener('message', handleMessage)

    cleanupSync = () => {
      window.removeEventListener('online', handleOnline)
      sw?.removeEventListener('message', handleMessage)
    }
  }

  consumers++
  const detach = cleanupSync
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    consumers--
    if (consumers <= 0 && cleanupSync === detach) {
      cleanupSync = null
      detach()
    }
  }
}
