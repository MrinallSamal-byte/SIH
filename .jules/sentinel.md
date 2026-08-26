## 2025-02-23 - Prevent User Enumeration Timing Leak and Uncaught Exception in Password Verification

**Vulnerability:** Non-existent admin login requests failed fast without executing `scryptSync`, allowing attackers to enumerate valid email addresses via response time measurement. Additionally, malformed hashes threw unhandled exceptions during `verifyPassword`.

**Learning:** When using computationally expensive password hashing (like `scrypt`), login logic must run a dummy verification using a standard hash format if the account is missing to ensure constant-time execution paths across valid and invalid usernames.

**Prevention:** Always perform dummy cryptographic checks when an identity lookup fails in authentication routines, and ensure password verification functions handle malformed hashes safely without throwing.
