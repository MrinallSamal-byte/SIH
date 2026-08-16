import { config } from '../config'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
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
 * @TODO BUILD: implement the Express server described in src/api/endpoints.ts,
 * then point VITE_API_URL at it. The Vite dev server proxies `/api` there.
 */
async function apiCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${config.apiUrl}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new ApiError(res.status, `${method} ${path} failed (${res.status})`)
  return (await res.json()) as T
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
  } catch {
    notifyFallback()
    return mock()
  }
}

export { apiCall, aiCall }
