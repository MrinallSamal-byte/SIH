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
import type { IncomingMessage, Server } from 'http';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { verifyAdminToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export type RealtimeEventType =
  | 'system:connected'
  | 'error'
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
  authHeader?: string;
}

export class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientMeta>();

  attach(server: Server, path = env.realtimePath): void {
    this.wss = new WebSocketServer({ server, path, maxPayload: 256 * 1024 });

    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      const meta: ClientMeta = { channels: new Set(['public']), authHeader: req.headers.authorization };
      this.clients.set(socket, meta);

      socket.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg && msg.action === 'subscribe' && Array.isArray(msg.channels)) {
            const requested: string[] = msg.channels.filter(
              (c: unknown): c is string => typeof c === 'string',
            );
            if (
              requested.some((c) => c.startsWith('admin')) &&
              !(await this.hasAdminAuth(msg.authorization ?? meta.authHeader))
            ) {
              this.send(socket, {
                type: 'error',
                payload: { message: 'Admin channel requires admin authorization' },
                timestamp: new Date().toISOString(),
              });
              return;
            }
            meta.channels = new Set(requested.filter((c): c is Channel => c === 'admin' || c === 'public'));
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

  private async hasAdminAuth(header: unknown): Promise<boolean> {
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
    try {
      const decoded = verifyAdminToken(header.slice('Bearer '.length).trim());
      if (decoded.role !== 'admin' || !decoded.sub) return false;
      const admin = await prisma.adminUser.findUnique({
        where: { id: decoded.sub },
        select: { id: true, isActive: true },
      });
      return Boolean(admin && admin.isActive);
    } catch {
      return false;
    }
  }

  closeAll(): void {
    for (const socket of this.clients.keys()) {
      try {
        socket.terminate();
      } catch {
        /* already gone */
      }
    }
    this.clients.clear();
  }

  private send(socket: WebSocket, event: RealtimeEvent): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(event));
    }
  }
}

export const realtimeHub = new RealtimeHub();