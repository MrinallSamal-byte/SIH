# Vercel Env Setup — AapdaSetu (SIH)

## Projects
- Frontend: `sih` (`prj_eW4v7yQYJTT4Ksa0CT8tfxrwKlhI`) → `aapdasetu-v3.vercel.app`
- Backend: `sih-backend` (`prj_4vNbYzXMgN5MC9dvGH5nmQMjBrrl`) → `sih-backend-ecru.vercel.app`
- Supabase NEW: `xkolfkroltdzdnpbovei` → `https://xkolfkroltdzdnpbovei.supabase.co`

## Quick Steps
1. **Supabase**: Create password if needed → Dashboard -> xkolfkroltdzdnpbovei -> Settings -> Database -> Reset password -> copy
2. **Supabase**: Get anon key -> Settings -> API -> `anon` / `publishable` key
3. **Supabase**: Run `supabase/full-setup-xkolfkroltdzdnpbovei.sql` in SQL Editor (creates all 32 tables + realtime)
4. **Vercel sih-backend**: Settings -> Environment Variables -> paste each line from `sih-backend.env` (Production+Preview) -> replace `[YOUR_PASSWORD]` and `JWT_SECRET` -> Save
5. **Vercel sih**: Settings -> Environment Variables -> paste each line from `sih-frontend.env` (Production+Preview) -> replace `VITE_SUPABASE_ANON_KEY` -> Save
6. **Redeploy both** (Vercel -> Deployments -> Redeploy, or `git commit --allow-empty -m "chore: env"` + push)
7. Verify: `curl https://sih-backend-ecru.vercel.app/api/v1/alerts` → `{"success":true,...}` not 500
   Then `https://aapdasetu-v3.vercel.app` -> check console -> `index-*.js` should contain `https://xkolfkroltdzdnpbovei.supabase.co` and `https://sih-backend-ecru.vercel.app` (not localhost)

## Testing Checklist (after deploy)
- SOS One-Tap: Home -> SOS -> should create `Report` with RED priority, appears in Admin -> Reports in realtime (5s poll + BroadcastChannel)
- Report Incident: `/report` -> submit with victim/missing -> check `Report` table
- Safety Check-in: `SafetyCheckin` table
- Missing Person: `MissingPerson` table
- Shelter Create (Admin): `Shelter` table
- Volunteer Assign: `Dispatch` + `Report.assignedVolunteerId`
- Damage Assessment: upload photo -> `DamageAssessment` table
- Broadcast Alert: Admin -> Communications -> send -> `Alert` table + realtime

All tables have realtime enabled (see SQL) and frontend `useRealtime` polls every 5s + instant via `realtimeEventBus`.

## Files
- `sih-frontend.env` → for `sih` project
- `sih-backend.env` → for `sih-backend` project
- `../supabase/full-setup-xkolfkroltdzdnpbovei.sql` → run in Supabase SQL Editor
