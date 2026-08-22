import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import WebSocket from 'ws';
import { RealtimeHub } from '../src/realtime/hub.js';
import { signAdminToken } from '../src/lib/jwt.js';

describe('RealtimeHub websocket authentication', () => {
  let server: Server;
  let hub: RealtimeHub;
  let serverPort: number;

  beforeAll(async () => {
    server = createServer();
    hub = new RealtimeHub();
    hub.attach(server, '/ws-test');
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          serverPort = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  interface HelperClient {
    ws: WebSocket;
    nextMessage: () => Promise<any>;
    close: () => void;
  }

  function createClient(): Promise<HelperClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${serverPort}/ws-test`);
      const queue: any[] = [];
      const waiters: Array<(msg: any) => void> = [];

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (waiters.length > 0) {
            const next = waiters.shift()!;
            next(parsed);
          } else {
            queue.push(parsed);
          }
        } catch (e) {
          /* ignore */
        }
      });

      function nextMessage(): Promise<any> {
        return new Promise((res) => {
          if (queue.length > 0) {
            res(queue.shift());
          } else {
            waiters.push(res);
          }
        });
      }

      ws.once('open', () => resolve({ ws, nextMessage, close: () => ws.close() }));
      ws.once('error', reject);
    });
  }

  it('allows public channel subscription without token', async () => {
    const client = await createClient();
    const initMsg = await client.nextMessage();
    expect(initMsg.type).toBe('system:connected');

    client.ws.send(JSON.stringify({ action: 'subscribe', channels: ['public'] }));
    const resp = await client.nextMessage();
    expect(resp.type).toBe('system:connected');
    expect(resp.payload.channels).toEqual(['public']);

    client.close();
  });

  it('rejects admin channel subscription without token', async () => {
    const client = await createClient();
    await client.nextMessage();

    client.ws.send(JSON.stringify({ action: 'subscribe', channels: ['admin', 'public'] }));
    const resp = await client.nextMessage();
    expect(resp.type).toBe('system:connected');
    expect(resp.payload.channels).toEqual(['public']); // admin filtered out

    client.close();
  });

  it('rejects admin channel subscription with invalid token', async () => {
    const client = await createClient();
    await client.nextMessage();

    client.ws.send(JSON.stringify({ action: 'subscribe', channels: ['admin'], token: 'invalid.jwt.token' }));
    const resp = await client.nextMessage();
    expect(resp.type).toBe('system:connected');
    expect(resp.payload.channels).toEqual([]); // admin rejected

    client.close();
  });

  it('accepts admin channel subscription with valid admin JWT', async () => {
    const token = signAdminToken({
      sub: 'admin-123',
      email: 'admin@aapdasetu.org',
      role: 'SUPER_ADMIN',
    });

    const client = await createClient();
    await client.nextMessage();

    client.ws.send(JSON.stringify({ action: 'subscribe', channels: ['admin', 'public'], token }));
    const resp = await client.nextMessage();
    expect(resp.type).toBe('system:connected');
    expect(resp.payload.channels).toContain('admin');
    expect(resp.payload.channels).toContain('public');

    client.close();
  });
});
