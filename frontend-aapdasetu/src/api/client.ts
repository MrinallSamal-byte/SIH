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

/**
 * Low-level fetch wrapper for the Express REST backend.
 * The backend wraps every response in `{ success, data }` and returns
 * `{ success: false, error }` on failure — this unwraps both.
 */
async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getAdminToken()
  if (token && path.startsWith('/api/v1/admin')) headers.Authorization = `Bearer ${token}`

  const base = config.apiUrl.replace(/\/$/, '')
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
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
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err
      if (attempt === 2) throw err
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1) + Math.random() * 200))
    }
  }
  throw lastErr as Error
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

/**
 * Runs the real backend call; on any failure (or when VITE_USE_MOCK_ONLY=true)
 * it silently returns mock data and notifies the "demo data" pill.
 */
export async function withMockFallback<T>(
  realCall: () => Promise<T>,
  mock: MockData<T>,
): Promise<T> {
  if (config.useMockOnly) {
    notifyFallback()
    return mock()
  }
  try {
    return await realCall()
  } catch (err) {
    if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      notifyFallback()
      return mock()
    }
    if (err instanceof TypeError) {
      notifyFallback()
      return mock()
    }
    if (err instanceof ApiError && err.status >= 500) {
      notifyFallback()
      return mock()
    }
    notifyFallback()
    return mock()
  }
}

export { apiCall, aiCall }
