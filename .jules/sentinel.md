# Sentinel Security Journal

## 2025-02-21 - Session Validation for Deactivated Accounts
**Vulnerability:** JWT authentication decoded tokens without checking database `isActive` status in session fetching (`getAdminSession`), allowing deactivated admin users holding valid JWTs to still retrieve session info via `GET /auth/me`.
**Learning:** Checking account active status at the login boundary alone is insufficient when sessions can be queried via endpoint handlers. Session retrieval must check `isActive` status in the database.
**Prevention:** Always verify account active/enabled status in database query wrappers used for session validation.
