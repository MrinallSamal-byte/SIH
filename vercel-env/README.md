# Vercel Env Setup — AapdaSetu (SIH)

## Projects
- Frontend: `sih` (`prj_eW4v7yQYJTT4Ksa0CT8tfxrwKlhI`) → `https://aapdasetu-v3.vercel.app`
- Backend: `sih-backend` (`prj_4vNbYzXMgN5MC9dvGH5nmQMjBrrl`) → `https://sih-backend-ecru.vercel.app`
- Supabase (SOLE DB): `vpstgjkkvzqnspcivvpz` → `https://vpstgjkkvzqnspcivvpz.supabase.co`

## Quick Steps
1. **Supabase**: Verified via Supabase MCP (all tables populated with 100+ dummy records, all migrations applied, and `supabase_realtime` active).
2. **Vercel sih-backend**: Settings -> Environment Variables -> paste variables from `sih-backend.env` (Production+Preview).
3. **Vercel sih**: Settings -> Environment Variables -> paste variables from `sih-frontend.env` (Production+Preview).
4. **Redeploy both** to apply build-time env vars (or push to `main`).
5. **Verify live backend**: `curl https://sih-backend-ecru.vercel.app/api/health` → `{"status":"ok"}`
   And `https://sih-backend-ecru.vercel.app/api/v1/shelters` returns live relief shelters.
6. **Verify live frontend**: `https://aapdasetu-v3.vercel.app` connects directly to Supabase Realtime and the Vercel backend.

## Testing Checklist (Live)
- SOS One-Tap: Home -> SOS -> creates `Report` with RED priority, syncs in Realtime via Supabase WebSocket channel.
- Report Incident: `/report` -> submit with victim/missing -> updates Supabase `Report` table.
- Safety Check-in: `/safety-checkin` -> writes to `SafetyCheckin` table.
- Missing Person: `/missing-persons` -> writes to `MissingPerson` table.
- Shelter Finder: `/shelters` -> fetches live relief camps from Supabase.
- Admin Panel: `/admin/login` -> prefilled with `adminapp@gmail.com` / `12345` -> live overview and report triage.
- Volunteer Portal: `/volunteer/login` -> prefilled with `9876543210` / `aapdasetu-dev-volunteer-code` -> live task management.

## Env Files
- `sih-frontend.env` → for `sih` Vercel project
- `sih-backend.env` → for `sih-backend` Vercel project
