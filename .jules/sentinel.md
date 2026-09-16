## 2026-09-16 - Tracked files bypass .gitignore (*.env was ignored-but-committed)
**Vulnerability:** `vercel-env/sih-backend.env` holding live server secrets was committed and stayed tracked across 3 commits even though `.gitignore` contains `*.env` — gitignore never applies to already-tracked files, so the rule gave false confidence.
**Learning:** In this repo, `vercel-env/*.env` files are local paste-helpers for the Vercel dashboard (nothing in code/CI reads them from git — verified zero references). Convenience env copies drift toward real values and get committed.
**Prevention:** After adding any ignore rule, run `git ls-files | grep -E '\.env$'` to catch already-tracked violators and `git rm --cached` them; never paste real values into `vercel-env/` — dashboard only.
