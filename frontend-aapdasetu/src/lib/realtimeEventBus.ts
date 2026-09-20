import { config } from '../config'
import { getAdminToken } from '../api/client'

// =============================================================================
// Real-time Event Bus for Instant Zero-Latency Cross-Tab & In-App Sync
// =============================================================================

export type RealtimeEventType =
  | 'report_created'
  | 'report_updated'
  | 'report_assigned'
  | 'shelter_created'
  | 'shelter_updated'
  | 'shelter_deleted'
  | 'alert_created'
  | 'checkin_created'
  | 'missing_created'
  | 'missing_updated'
  | 'volunteer_updated'
  | 'damage_assessed'
  | 'damage_updated'
  | 'data_reset'

export interface RealtimeEvent {
  type: RealtimeEventType
  entityId?: string
  timestamp: number
  payload?: unknown
}

type RealtimeListener = (event: RealtimeEvent) => void

const listeners = new Set<RealtimeListener>()
const CHANNEL_NAME = 'aapdasetu_realtime_channel'

let broadcastChannel: BroadcastChannel | null = null
let realtimeSocket: WebSocket | null = null
let realtimeReconnectTimer: ReturnType<typeof setTimeout> | null = null

function dispatchRealtimeEvent(event: RealtimeEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (err) {
      console.error('Realtime listener error:', err)
    }
  })
}

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
    broadcastChannel.onmessage = (event: MessageEvent<RealtimeEvent>) => {
      if (event.data && typeof event.data.type === 'string') {
        dispatchRealtimeEvent(event.data)
      }
    }
  }
} catch {
  // BroadcastChannel unavailable
}

// Fallback: storage event listener for cross-window sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'aapdasetu_realtime_storage_event' && e.newValue) {
      try {
        const event = JSON.parse(e.newValue) as RealtimeEvent
        dispatchRealtimeEvent(event)
      } catch {
        // Ignore malformed storage event payloads
      }
    }
  })
}

function connectRealtimeSocket(): void {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return
  const base = config.apiUrl || window.location.origin
  const socketUrl = `${base.replace(/^http/, 'ws')}/ws`
  try {
    realtimeSocket = new WebSocket(socketUrl)
    realtimeSocket.addEventListener('open', () => {
      const authorization = getAdminToken()
      realtimeSocket?.send(JSON.stringify({
        action: 'subscribe',
        channels: authorization ? ['public', 'admin'] : ['public'],
        ...(authorization ? { authorization: `Bearer ${authorization}` } : {}),
      }))
    })
    realtimeSocket.addEventListener('message', (message) => {
      try {
        const event = JSON.parse(String(message.data)) as RealtimeEvent
        if (event && typeof event.type === 'string') dispatchRealtimeEvent(event)
      } catch {
        // Ignore malformed server frames.
      }
    })
    realtimeSocket.addEventListener('close', () => {
      realtimeSocket = null
      if (realtimeReconnectTimer === null) {
        realtimeReconnectTimer = setTimeout(() => {
          realtimeReconnectTimer = null
          connectRealtimeSocket()
        }, 5000)
      }
    })
  } catch {
    realtimeSocket = null
  }
}

connectRealtimeSocket()

/**
 * Emit a real-time event across the current tab and all other open tabs.
 */
export function emitRealtimeUpdate(type: RealtimeEventType, entityId?: string, payload?: unknown) {
  const event: RealtimeEvent & { nonce?: number } = {
    type,
    entityId,
    timestamp: Date.now(),
    payload,
    nonce: Math.random(),
  }

  // 1. Notify in-memory listeners in current window
  dispatchRealtimeEvent(event)

  // 2. Broadcast to other tabs via BroadcastChannel (preferred)
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(event)
      return
    }
  } catch {
    // BroadcastChannel posting may fail if closed or structured clone unsupported
  }

  // 3. Fallback via localStorage storage event (only when BroadcastChannel unavailable,
  //    otherwise remote tabs receive the event twice)
  try {
    localStorage.setItem('aapdasetu_realtime_storage_event', JSON.stringify(event))
  } catch {
    // Storage quota or privacy mode may block localStorage write
  }
}

/**
 * Subscribe to real-time events. Returns an unsubscribe function.
 */
export function subscribeRealtimeUpdates(callback: RealtimeListener): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
