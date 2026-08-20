## 2025-05-18 - Authentication Timing Side-Channel in Admin Login
**Vulnerability:** In `loginAdmin`, password verification (`verifyPassword`) was short-circuited when an admin user was not found in the database.
**Learning:** Short-circuiting password verification causes a significant execution timing delta (~1ms for non-existent users vs ~300ms scrypt execution for existing users). This allows unauthenticated remote attackers to enumerate valid administrator emails via timing analysis.
**Prevention:** Always execute password verification (`verifyPassword`) against a validly formatted dummy hash when a user query returns null, ensuring constant-time evaluation regardless of account existence.
