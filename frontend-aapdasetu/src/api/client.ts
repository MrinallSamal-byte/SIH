import { config } from '../config'

export const ADMIN_SESSION_KEY = 'aapdasetu_admin_session'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Thrown when a write reaches the network while the device is offline —
 * callers (e.g. the outbox) use it to decide whether to queue locally. */
export class OfflineError extends Error {
  constructor(message = 'You are offline — the request was not sent') {
    super(message)
    this.name = 'OfflineError'
  }
}

/**
 * Honesty ledger for the mock-fallback system. Another agent renders a status
 * badge from this — do not rename or move.
 */
export const apiHealth = {
  lastAttemptAt: null as number | null,
  lastSuccessAt: null as number | null,
  lastWasMock: false,
}

/** Reads the stored admin session ({ token, email, name }) from localStorage. */
export function getAdminToken(): string | undefined {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return undefined
    const session = JSON.parse(raw) as { token?: string }
    return session.token || undefined
  } catch {
    return undefined
  }
}

export type MockData<T> = () => T | Promise<T>

// Global "demo data" pill: fires whenever the backend is unreachable and the
// client falls back to mock data. Subscribe via hooks/useDemoMode.ts.
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeFallback(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyFallback() {
  listeners.forEach((l) => l())
}

/**
 * fetch with an AbortController timeout so a hanging backend can never freeze
 * the UI — withMockFallback then kicks in after timeoutMs and returns mocks.
 */
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ---- unreachable-API fail fast ------------------------------------------------
// Once the API proves unreachable we stop hammering it for a cool-off window so
// pages fall back to demo data instantly instead of waiting out full retry
// loops every poll cycle (critical for deployments built without VITE_API_URL).
const API_DOWN_COOLDOWN_MS = 30_000
const MAX_ATTEMPTS = 2
let apiDownUntil = 0

/** True when the configured API is a loopback address (localhost default). */
function isLoopbackApi(): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i.test(config.apiUrl)
}

/** True when the configured API can never answer — e.g. a build without
 * VITE_API_URL served over HTTPS: every visitor would just hit their own
 * machine on localhost, wasting seconds per call before mock fallback. */
function apiIsUnreachable(): boolean {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && isLoopbackApi()) return true
  return apiDownUntil > Date.now()
}

function markApiDown() {
  apiDownUntil = Date.now() + API_DOWN_COOLDOWN_MS
}

/**
 * Low-level fetch wrapper for the Express REST backend.
 * The backend wraps every response in `{ success, data }` and returns
 * `{ success: false, error }` on failure — this unwraps both.
 */
async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  // Mutations (POST/PUT/PATCH/DELETE) must never be silently faked with mock
  // data — fail fast offline and tag failures so withMockFallback rethrows.
  const mutating = method.toUpperCase() !== 'GET'
  if (mutating && typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new OfflineError()
  }
  if (apiIsUnreachable()) throw new ApiError(503, 'API unreachable')

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getAdminToken()
  if (token && path.startsWith('/api/v1/admin')) headers.Authorization = `Bearer ${token}`

  const base = config.apiUrl.replace(/\/$/, '')
  let lastErr: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const payload = (await res.json().catch(() => null)) as
        | { success: boolean; data?: T; error?: { message?: string } }
        | null

      if (!res.ok || !payload?.success) {
        throw new ApiError(res.status, payload?.error?.message ?? `${method} ${path} failed (${res.status})`)
      }
      return payload.data as T
    } catch (err) {
      lastErr = err
      if (!(err instanceof ApiError)) {
        // Network-level failure (refused/DNS/timeout): probe again only after
        // the cool-off window instead of retrying on every poll tick.
        markApiDown()
        throw tagMutating(err)
      }
      if (err.status >= 400 && err.status < 500) throw tagMutating(err)
      if (attempt === MAX_ATTEMPTS - 1) throw tagMutating(err)
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  throw tagMutating(lastErr)

  /** Marks errors from non-GET requests so the mock fallback can never swallow them. */
  function tagMutating(err: unknown): unknown {
    if (mutating && err instanceof Error) {
      ;(err as Error & { mutating?: boolean }).mutating = true
    }
    return err
  }
}

/**
 * Low-level fetch wrapper for the FastAPI AI engine.
 * @TODO BUILD: wrap apps/ai-engine/app/*.py as FastAPI routes (see src/api/ai.ts).
 */
async function aiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${config.aiUrl}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new ApiError(res.status, `${method} ${path} failed (${res.status})`)
  return (await res.json()) as T
}

export interface MockFallbackOptions {
  /** True for write calls (POST/PUT/PATCH/DELETE): failures always propagate —
   * mock data must never fake a successful submission. */
  mutating?: boolean
}

function isMutatingFailure(err: unknown): boolean {
  return (
    err instanceof OfflineError ||
    Boolean((err as { mutating?: boolean } | null | undefined)?.mutating)
  )
}

/**
 * Runs the real backend call; on failure of a read-only call (or when
 * VITE_USE_MOCK_ONLY=true) it returns mock data and notifies the "demo data"
 * pill. Write calls never fall back to mocks — they throw so callers can queue
 * honestly via the outbox (src/lib/outbox.ts).
 */
export async function withMockFallback<T>(
  realCall: () => Promise<T>,
  mock: MockData<T>,
  options: MockFallbackOptions = {},
): Promise<T> {
  if (config.useMockOnly && !options.mutating) {
    notifyFallback()
    apiHealth.lastWasMock = true
    return mock()
  }
  try {
    const data = await realCall()
    apiHealth.lastAttemptAt = Date.now()
    apiHealth.lastSuccessAt = Date.now()
    apiHealth.lastWasMock = false
    return data
  } catch (err) {
    apiHealth.lastAttemptAt = Date.now()
    if (options.mutating || isMutatingFailure(err)) {
      if (!navigator.onLine) throw new OfflineError()
      console.error('[aapdasetu] write failed — refusing to fake success with mock data', err)
      throw err
    }
    // Read-only degradation: serve demo data and flag it via apiHealth.
    notifyFallback()
    apiHealth.lastWasMock = true
    return mock()
  }
}

// ---- snapshot cache (stale-while-revalidate) -----------------------------------
const SNAPSHOT_PREFIX = 'aapdasetu:snapshot:'

/** Last persisted payload for an endpoint, or null. Lets list pages paint
 * instantly from the previous visit while a fresh fetch runs in background. */
export function readSnapshot<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Persist a successful fetch result so the next visit renders it instantly. */
export function writeSnapshot<T>(key: string, data: T): void {
  try {
    localStorage.setItem(SNAPSHOT_PREFIX + key, JSON.stringify(data))
  } catch {
    // Storage full/blocked — snapshots are best-effort only
  }
}

export { apiCall, aiCall }
