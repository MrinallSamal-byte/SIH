# Sentinel Security Journal

## 2026-08-24 - Sanitizing Internal Server Error Messages (CWE-209)
**Vulnerability:** Unhandled runtime/database errors in express error middleware leaked raw error messages to API clients on 500 status responses.
**Learning:** Returning raw error messages from generic `Error` instances can expose sensitive database details or backend environment data.
**Prevention:** Always verify `isHttpError(err)` before exposing error message strings to clients for 500+ status codes in central error handlers.
