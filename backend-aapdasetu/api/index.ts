/**
 * Vercel serverless entrypoint. The WebSocket hub stays dormant here
 * (frontend polls REST; no WS client exists) — safe no-op.
 */
// ponytail: serverless = per-request cold starts + no persistent WS;
// upgrade path: dedicated long-running host (Render/Railway/Fly) when
// realtime push matters.
import { createApp } from '../src/app.js';

const app = createApp();

export default app;
