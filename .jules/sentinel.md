## 2025-05-10 - WebSocket Channel Authorization Lacks Account Status Verification
**Vulnerability:** `realtimeHub` authorized WebSocket subscriptions to sensitive `admin` channels by verifying only the JWT signature, omitting database checks for disabled (`isActive: false`) admin accounts.
**Learning:** HTTP middleware `requireAdmin` verified both JWT signatures and `admin.isActive` in Prisma DB, but WebSocket event listeners performed stateless JWT verification.
**Prevention:** Always verify account active status against database records in WebSocket subscription handlers, matching HTTP authorization checks.
