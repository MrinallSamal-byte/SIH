/**
 * Realtime event hub — Node WebSocket implementation (replaces Supabase Realtime).
 *
 * Channels:
 *   - "admin"  : full dispatch stream (SOS, reports, assignments, alerts, volunteers, shelters)
 *   - "public" : citizen-facing stream (new alerts, safety broadcasts, shelter capacity)
 *
 * Clients may join one or more channels via { action: 'subscribe', channels: [...] }.
 * RED SOS events carry `highPriority: true` so the command center can raise sound alarms.
 */
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { verifyAdminToken } from '../lib/jwt.js';

export type RealtimeEventType =
  | 'system:connected'
  | 'sos:new'
  | 'report:new'
  | 'report:update'
  | 'report:assignment'
  | 'report:resolution'
  | 'alert:new'
  | 'alert:update'
  | 'volunteer:status'
  | 'shelter:capacity'
  | 'dispatch:update';

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
  highPriority?: boolean;
}

type Channel = 'admin' | 'public';

interface ClientMeta {
  channels: Set<Channel>;
}

export class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientMeta>();

  attach(server: Server, path = env.realtimePath): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (socket) => {
      const meta: ClientMeta = { channels: new Set(['public']) };
      this.clients.set(socket, meta);

      socket.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg && msg.action === 'subscribe' && Array.isArray(msg.channels)) {
            const requestedChannels: string[] = msg.channels;
            const granted = new Set<Channel>();

            if (requestedChannels.includes('public')) {
              granted.add('public');
            }

            if (requestedChannels.includes('admin')) {
              if (typeof msg.token === 'string') {
                try {
                  verifyAdminToken(msg.token);
                  granted.add('admin');
                } catch {
                  logger.warn('Unauthorized attempt to subscribe to realtime admin channel');
                }
              } else {
                logger.warn('Missing JWT token for realtime admin channel subscription');
              }
            }

            meta.channels = granted;
            this.send(socket, {
              type: 'system:connected' as RealtimeEventType,
              payload: { channels: [...meta.channels] },
              timestamp: new Date().toISOString(),
            });
          }
        } catch {
          /* ignore malformed control frames */
        }
      });

      socket.on('close', () => {
        this.clients.delete(socket);
      });

      socket.on('error', (err) => {
        logger.warn('realtime socket error', { message: err.message });
      });

      this.send(socket, {
        type: 'system:connected' as RealtimeEventType,
        payload: { message: 'connected', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    });

    logger.info(`Realtime hub attached at ${path}`);
  }

  broadcast(event: RealtimeEvent, channel: Channel = 'admin'): void {
    if (!this.wss) return;
    const frame = JSON.stringify(event);
    for (const [socket, meta] of this.clients) {
      if (socket.readyState === WebSocket.OPEN && meta.channels.has(channel)) {
        socket.send(frame);
      }
    }
  }

  /** Public convenience: emit SOS/report event. */
  emitSos(report: Record<string, unknown>): void {
    this.broadcast(
      {
        type: 'sos:new',
        payload: report,
        timestamp: new Date().toISOString(),
        highPriority: report.priorityLabel === 'RED',
      },
      'admin',
    );
  }

  emitAlert(alert: Record<string, unknown>): void {
    this.broadcast(
      { type: 'alert:new', payload: alert, timestamp: new Date().toISOString() },
      'public',
    );
    this.broadcast(
      { type: 'alert:new', payload: alert, timestamp: new Date().toISOString() },
      'admin',
    );
  }

  private send(socket: WebSocket, event: RealtimeEvent): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(event));
    }
  }
}

export const realtimeHub = new RealtimeHub();