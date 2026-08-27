## 2025-05-18 - Database existence check discrepancy in JWT authentication middleware
**Vulnerability:** `requireAdmin` verified user active status in PostgreSQL via Prisma, but `requireVolunteer` only validated JWT signature/expiration. Revoked or deleted volunteer accounts remained capable of executing protected volunteer actions until JWT token expiration.
**Learning:** In multi-role auth systems, ensure all authorization middleware checks DB persistence or revocation status consistently across all roles, not just admin roles.
**Prevention:** Ensure every authentication middleware checking bearer JWTs validates entity persistence in DB or checks a token revocation blacklist.
