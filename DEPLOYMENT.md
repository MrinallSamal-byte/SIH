# AapdaSetu — Vercel Deployment Guide

This repo deploys as **two separate Vercel projects**:

| Project | Root Directory | What it serves |
|---|---|---|
| **Web** | repo root | Static Vite build of `frontend-aapdasetu` (`vercel.json` at root) |
| **API** | `backend-aapdasetu` | Express serverless function (`backend-aapdasetu/vercel.json` → `api/index.ts`, route `/api/*`) |

> **Why the API is a separate project:** Vercel serverless functions cannot hold
> WebSocket connections (the realtime hub is dormant there — the frontend polls
> REST) and request bodies are capped at **4.5 MB** at the platform edge. All
> code here accounts for both constraints.

---

## 1. API project (Root Directory: `backend-aapdasetu`)

Framework preset: **Other**. Build command: none needed (Vercel compiles
`api/index.ts` directly; `postinstall` runs `prisma generate`).

### Required environment variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://…?sslmode=require` | Managed Postgres (Supabase transaction pooler) |
| `JWT_SECRET` | 32+ random chars | Signs admin/volunteer JWTs |
| `ADMIN_PASSWORD` | strong password | Boot-critical; also seeds the admin |
| `ADMIN_EMAIL` | e.g. `admin@aapdasetu.org` | |
| `VOLUNTEER_ACCESS_CODE` | strong shared code | Volunteer signup/login |
| `CORS_ORIGINS` | `https://<your-web-project>.vercel.app` | Comma-separated exact origins. **If unset, the browser blocks every cross-origin call** |
| `TRUST_PROXY` | `1` | **Must be 1 on Vercel.** Without it, express-rate-limit rejects every request carrying `x-forwarded-for` (Vercel always sends it) and the whole API 500s. The code auto-defaults to 1 when it detects the Vercel runtime, but set it explicitly |

### Optional

| Variable | Default behavior when unset |
|---|---|
| `OPENROUTER_API_KEY` | PFA chatbot serves its deterministic safety fallback (still answers crisis keywords) |
| `DAMAGE_ML_BASE_URL` | Damage-assessment route returns a clean 503 after timeout |
| `TWILIO_*` / `WHATSAPP_*` | SMS/WhatsApp broadcast channels are skipped; alerts still persist to web |
| `UPLOAD_MAX_SIZE_MB` | `3` recommended (Vercel body cap ≈ 4.5 MB) |
| `RATE_LIMIT_*` | Defaults are sane; the SOS route has its own dedicated bucket |

### One-time database setup

Vercel does **not** run migrations. From `backend-aapdasetu/` with prod `DATABASE_URL`:

```bash
npx prisma migrate deploy   # applies all migrations, incl. SOS idempotency
npm run db:seed             # optional demo data; refuses default admin password in prod
```

The serverless entry also lazily bootstraps the admin account from
`ADMIN_EMAIL`/`ADMIN_PASSWORD` on first cold start.

### Health checks

`GET /api/health` (shallow) and `GET /api/health/deep` (DB + ML, admin JWT).
The bare `/health` path does **not** exist on Vercel — only `/api/*` reaches the
function.

---

## 2. Web project (repo root)

Build: `cd frontend-aapdasetu && npm install && npm run build` → static `dist/`.

### Environment variables (set BEFORE building — `VITE_*` is baked at build time)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<api-project>.vercel.app` — **origin root only, no `/api` suffix** (endpoint paths already start with `/api/v1/…`) |
| `VITE_AI_URL` | Deployed FastAPI engine URL, or leave unset (AI calls degrade honestly) |
| `VITE_USE_MOCK_ONLY` | `false` (or unset) |

**Never leave `VITE_API_URL` pointing at localhost in a production build.** If
unset, the production bundle falls back to same-origin (`''`), which only works
if you proxy `/api/*` to the backend — otherwise every read shows the DEMO DATA
banner and writes fail honestly. After changing any `VITE_*` var, **redeploy**.

### Demo-data honesty

When the backend is unreachable, read-only pages fall back to generated sample
data and a persistent **"Demo mode"** banner shows on every citizen page. SOS
and all other writes are **never** faked — they queue in the outbox or surface
an error.

---

## 3. Production checklist

- [ ] `npx prisma migrate deploy` ran against the prod DB
- [ ] API env vars set (all six required) and project redeployed
- [ ] `curl https://<api>/api/health` returns `{"status":"ok"}`
- [ ] Web `VITE_API_URL` set → hard-refresh the site → no "Demo mode" banner
- [ ] Citizen smoke test: send an SOS (check admin LiveSOS shows it RED with siren), submit a check-in, search it via the family-search phone lookup
- [ ] Admin smoke test: log in, assign a volunteer to the SOS, verify the volunteer portal picks it up on its 12 s poll
- [ ] `UPLOAD_MAX_SIZE_MB=3` set on the API (damage photos are client-compressed first)

## 4. Known platform limits

- **Request bodies > 4.5 MB** are rejected by Vercel before the function runs —
  damage photos are compressed client-side and the zod schema caps at ~4 MB of
  base64.
- **Rate limiting is per-lambda-instance** (in-memory store). Effective public
  limits scale with warm instance count; for hard guarantees use a Redis-backed
  limiter.
- **`/downloads/*.apk` (~122 MB total)** ships inside the frontend deployment.
  Fine on Pro; on Hobby the 100 MB CLI deploy limit can reject them — consider
  Vercel Blob or GitHub Releases for the APKs.
