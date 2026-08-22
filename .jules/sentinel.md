## 2026-08-22 - Unauthenticated WebSocket Admin Channel Subscription
**Vulnerability:** Any WebSocket client could send a `{ action: 'subscribe', channels: ['admin'] }` frame and subscribe to sensitive internal dispatch events without presenting an admin authentication token.
**Learning:** WebSocket handlers often bypass HTTP middleware pipelines (like express auth middleware), requiring explicit token verification during control frame message handling.
**Prevention:** Always require and verify JWT token in WebSocket frame subscription logic before granting access to privileged channels.
