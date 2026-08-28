## 2025-05-18 - Stateless JWT Authorization Bypass for Volunteers
**Vulnerability:** The `requireVolunteer` middleware verified JWT token signature but did not check if the volunteer account existed in the database, allowing revoked/deleted volunteer accounts to access protected endpoints.
**Learning:** `requireAdmin` validated user existence against Prisma (`prisma.adminUser.findUnique`), whereas `requireVolunteer` only checked stateless JWT claims.
**Prevention:** Always verify account existence and status in database for all authentication middleware before granting access to protected routes.
