import {
  createDamageAssessment,
  createMissingPerson,
  createReport,
  createSafetyCheckin,
} from '../api/endpoints'
import { ApiError, OfflineError, isQueueableError } from '../api/client'

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
const OUTBOX_LOCK_KEY = 'aapdasetu_outbox_lock'
const OUTBOX_LOCK_TTL_MS = 30_000
const MAX_ATTEMPTS = 5
const MAX_FLUSH_PASSES = 10

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

function writeOutbox(items: OutboxItem[]): boolean {
  let persisted = true
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items))
  } catch {
    // Storage blocked/full (private mode, big base64 payloads) — queue is
    // best-effort only; callers verify and must warn the user when an item
    // did NOT persist, otherwise submissions are silently lost.
    persisted = false
  }
  notifyOutboxListeners()
  return persisted
}

// ---- change notifications -----------------------------------------------------
// Lets UI (e.g. the SOS queued-banner count) reflect the real queue without
// polling. Listener errors must never break queue operations.
type OutboxListener = () => void
const outboxListeners = new Set<OutboxListener>()

/** Subscribe to outbox mutations (enqueue/remove/attempt-bump). Returns an
 * unsubscribe function. Safe to call multiple times. */
export function subscribeOutbox(fn: OutboxListener): () => void {
  outboxListeners.add(fn)
  return () => {
    outboxListeners.delete(fn)
  }
}

function notifyOutboxListeners(): void {
  outboxListeners.forEach((l) => {
    try {
      l()
    } catch {
      // ignore listener errors
    }
  })
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

/** Queue a payload for later submission. Returns the generated item id.
 * SOS/report payloads are stamped with a stable clientRequestId and the
 * original clientCreatedAt so outbox replays can never create duplicate
 * rescue dispatches and keep their true reporting time. */
export function enqueueOutbox(kind: OutboxKind, payload: unknown): string {
  const id = newId()
  const items = readOutbox()
  let itemPayload = payload
  if ((kind === 'sos' || kind === 'report') && itemPayload && typeof itemPayload === 'object') {
    const obj = { ...(itemPayload as Record<string, unknown>) }
    if (!obj.clientRequestId) obj.clientRequestId = newId()
    if (!obj.clientCreatedAt) obj.clientCreatedAt = new Date().toISOString()
    itemPayload = obj
  }
  items.push({ id, kind, payload: itemPayload, createdAt: Date.now(), attempts: 0 })
  writeOutbox(items)
  // Best-effort: on browsers that support Background Sync, the service
  // worker re-fires the flush event after connectivity returns (even if the
  // tab was reloaded). Note the SW nudges open clients — closed-tab delivery
  // still relies on the next app launch. Unsupported browsers fall back to
  // the 'online' event and the 20s retry timer.
  registerBackgroundSync()
  return id
}

/** True if the item actually persisted (localStorage can silently drop writes
 * when full — callers must tell the user instead of faking success). */
export function isQueued(id: string): boolean {
  return readOutbox().some((item) => item.id === id)
}

function registerBackgroundSync(): void {
  try {
    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined
    if (!sw) return
    void sw.ready
      .then((reg) => {
        // Feature-detected: SyncManager is Chromium-only.
        const sync = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync
        return sync ? sync.register('aapdasetu-outbox') : undefined
      })
      .catch(() => {
        /* background sync unavailable — retry timer covers us */
      })
  } catch {
    // ignore
  }
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

// ---- cross-tab flush lock -------------------------------------------------------
// The in-module single-flight promise only guards concurrent calls within one
// tab; two tabs flushing simultaneously could double-send (both read the same
// item before either removes it). This localStorage lock with a timestamp TTL
// hands flushing to exactly one tab: verify-after-write picks the winner, and
// a crashed tab's lock self-expires after OUTBOX_LOCK_TTL_MS.
function parseLock(raw: string): { token?: unknown; ts?: unknown } | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as { token?: unknown; ts?: unknown }) : null
  } catch {
    return null
  }
}

function acquireOutboxLock(): string | null {
  try {
    const raw = localStorage.getItem(OUTBOX_LOCK_KEY)
    if (raw) {
      const held = parseLock(raw)
      // A fresh lock owned by another tab blocks us; stale or corrupt locks don't.
      const fresh =
        held !== null &&
        typeof held.ts === 'number' &&
        Date.now() - held.ts < OUTBOX_LOCK_TTL_MS &&
        typeof held.token === 'string'
      if (fresh) return null
    }
    const token = newId()
    localStorage.setItem(OUTBOX_LOCK_KEY, JSON.stringify({ token, ts: Date.now() }))
    // Read-back race check: if another tab wrote its own token after ours, it wins.
    const confirmRaw = localStorage.getItem(OUTBOX_LOCK_KEY)
    const confirmed = confirmRaw ? parseLock(confirmRaw) : null
    return confirmed?.token === token ? token : null
  } catch {
    return null // storage unavailable — queue itself is unusable anyway
  }
}

function releaseOutboxLock(token: string): void {
  try {
    const raw = localStorage.getItem(OUTBOX_LOCK_KEY)
    if (!raw) return
    const held = parseLock(raw)
    if (held?.token === token) localStorage.removeItem(OUTBOX_LOCK_KEY)
  } catch {
    // ignore — TTL covers it
  }
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

// Single-flight lock so mount/online/SW nudges never double-submit an SOS.
let flushing: Promise<FlushResult> | null = null

async function runFlush(): Promise<FlushResult> {
  try {
    // Never burn retry attempts while provably offline.
    if (isOffline()) return { synced: 0, failed: 0 }
    const lockToken = acquireOutboxLock()
    if (!lockToken) return { synced: 0, failed: 0 } // another tab owns the flush

    let synced = 0
    let failed = 0
    try {
      // Re-snapshot each pass so items enqueued mid-flush are not stranded
      // until the next online event. Extra passes only continue after real
      // progress, so a downed backend can't hammer/burn attempts in a loop.
      for (let pass = 0; pass < MAX_FLUSH_PASSES; pass++) {
        const syncedBeforePass = synced
        for (const original of readOutbox()) {
          if (original.attempts >= MAX_ATTEMPTS) continue // poison-pill guard: left queued, no longer retried
          // Persist the attempt bump BEFORE sending: a crash mid-send may
          // cause one at-least-once resend, but can never retry forever.
          writeOutbox(readOutbox().map((i) => (i.id === original.id ? { ...original, attempts: original.attempts + 1 } : i)))
          // Heartbeat the cross-tab lock BEFORE each send: a pass over slow/
          // unreachable items can outlive OUTBOX_LOCK_TTL_MS, and an expired
          // lock lets another tab flush the same items concurrently.
          try {
            localStorage.setItem(OUTBOX_LOCK_KEY, JSON.stringify({ token: lockToken, ts: Date.now() }))
          } catch {
            // storage hiccup — TTL self-heals via releaseOutboxLock
          }
          try {
            await replayItem(original)
            removeFromOutbox(original.id)
            synced++
          } catch (err) {
            if (err instanceof OfflineError || isOffline()) {
              // Device dropped mid-flush: refund the attempt and stop — items
              // stay queued at full budget for the next reconnect.
              writeOutbox(readOutbox().map((i) => (i.id === original.id ? original : i)))
              return { synced, failed }
            }
            failed++
            if (
              err instanceof ApiError &&
              err.status >= 400 &&
              err.status < 500 &&
              err.status !== 408 &&
              err.status !== 429
            ) {
              // Permanent rejection (validation/auth): retrying can never
              // succeed — drop so it cannot clog the queue forever.
              removeFromOutbox(original.id)
              console.warn('[aapdasetu] outbox item permanently rejected, dropping:', original.kind, err.message)
            } else if (isQueueableError(err)) {
              // Refund the attempt: a backend outage / throttle must not burn
              // the finite retry budget while the device stays online — that
              // used to strand queued SOS submissions permanently after
              // ~100s of unavailability (the exact scenario the outbox
              // exists for). The 20s retry timer's backoff bounds the load.
              writeOutbox(readOutbox().map((i) => (i.id === original.id ? original : i)))
            }
          }
        }
        if (synced === syncedBeforePass) break
      }
    } finally {
      releaseOutboxLock(lockToken)
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

/** One-time migration of the old SOS-page-only queue into the global outbox.
 * Handles BOTH legacy shapes (single object or array) without throwing, and
 * normalises old flat {latitude,longitude} payloads onto ReportInput's
 * location{lat,lng} so coordinates survive the round-trip through
 * createReport's reportBody mapping. */
function normalizeLegacySosPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...payload }
  if (
    normalized.location === undefined &&
    typeof normalized.latitude === 'number' &&
    typeof normalized.longitude === 'number'
  ) {
    normalized.location = { lat: normalized.latitude, lng: normalized.longitude }
  }
  return normalized
}

function migrateLegacySosQueue(): void {
  try {
    const raw = localStorage.getItem(LEGACY_SOS_KEY)
    if (!raw) return
    localStorage.removeItem(LEGACY_SOS_KEY)
    const parsed = JSON.parse(raw) as unknown
    const queue = Array.isArray(parsed) ? parsed : [parsed]
    for (const payload of queue) {
      if (payload && typeof payload === 'object') {
        enqueueOutbox('sos', normalizeLegacySosPayload(payload as Record<string, unknown>))
      }
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

// Bounded backoff for the while-online retry timer: the 'online' event and
// Background Sync miss the common case where the backend was down but the
// device stayed online — without this timer a queued SOS would sit stranded
// until the user reloaded the page.
const RETRY_INTERVAL_MS = 20_000
let nextRetryAt = 0

/**
 * Arms global outbox syncing: migrates legacy data, flushes immediately, then
 * re-flushes on window 'online', on the service worker's OUTBOX_FLUSH nudge
 * (Background Sync), and on a 20 s retry timer while items remain queued.
 * Idempotent and refcounted — multiple pages/layouts may subscribe; listeners
 * stay armed until the LAST consumer cleans up (so one page unmounting can
 * never disarm syncing for the rest of the app).
 */
export function initGlobalOutboxSync(): () => void {
  if (!cleanupSync) {
    migrateLegacySosQueue()
    void flushOutbox()

    const handleOnline = () => {
      nextRetryAt = 0
      void flushOutbox()
    }
    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined
    const handleMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'OUTBOX_FLUSH') {
        nextRetryAt = 0
        void flushOutbox()
      }
    }
    const retryTimer = window.setInterval(() => {
      if (isOffline() || Date.now() < nextRetryAt) return
      // Only spend the attempt when there is actually something to send.
      if (readOutbox().length === 0) return
      void flushOutbox().then((result) => {
        if (result.synced === 0 && result.failed > 0) {
          // Backend still unreachable — back off instead of hot-looping.
          nextRetryAt = Date.now() + RETRY_INTERVAL_MS * 2
        }
      })
    }, RETRY_INTERVAL_MS)

    window.addEventListener('online', handleOnline)
    sw?.addEventListener('message', handleMessage)

    cleanupSync = () => {
      window.clearInterval(retryTimer)
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
