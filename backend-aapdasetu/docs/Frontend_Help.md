1. Architecture Summary
Citizen Web (React/Next) ─┬─ HTTP ──▶ Node.js Backend (Express 4 + TypeScript)
                          │                │
                          └─ WebSocket ──▶ Realtime Hub (ws://:4000/ws)
                                          │
Route → Controller → Service → Prisma → PostgreSQL 16
                Service → Adapter/Client → External services
                                          ├─ OpenRouter (PFA LLM, free tier)
                                          └─ FastAPI AI Engine (:8001)
                                               └─ POST /api/v1/damage-assessment/predict
                                                    └─ existing ML model (placeholder seam)
- Layering: Route → Controller → Service → Prisma; external calls go Service → Adapter/Client → External Service (src/adapters/openrouter.client.ts, src/adapters/damageMl.client.ts).
- Realtime: own ws hub (replaces Supabase Realtime) with admin/public channels; RED SOS events carry highPriority: true.
- Admin auth: JWT (Bearer) replacing Supabase verify_admin_login(); passwords hashed with scrypt (src/lib/crypto.ts); rate limiting, helmet, CORS, Zod validation, audit logging on every admin action.
- Citizens: zero auth on all public endpoints.
2. Database Summary (Prisma 6 models)
Report, Volunteer, Shelter, Agency, Resource, Alert, AuditLog, SafetyCheckin — plus supporting AdminUser, DamageAssessment, MissingPersonMatch, RouteHazard, Dispatch.
Key relations: Report.assignedVolunteer/assignedAgency (FKs, with history in Dispatch), Shelter → Resource (1:N), Report → DamageAssessment (1:N), Report ⇄ Report via MissingPersonMatch (self-relations), Volunteer/Agency → Report (assignments). UUID PKs, enums for all status/type fields, indexes on status/priority/geo/createdAt, updated_at auto-touch. Migration applied and verified (prisma migrate status → up to date).
3. Node.js Route Table
Public (no auth) — POST /api/v1/sos · POST /api/v1/reports · GET /api/v1/reports/track/:trackingId · POST /api/v1/checkins · GET /api/v1/shelters/nearby · GET /api/v1/alerts · POST /api/v1/pfa/chat · GET /api/v1/pfa/health · POST /api/v1/damage-assessment · POST /api/v1/missing/matches · GET /api/v1/safe-routes/hazards · POST /api/v1/safe-routes/reroute
Admin (JWT) — POST/GET /auth/login|me|change-password · GET /overview · GET/PATCH/POST /reports[...] (list, get, /status, /assign, /unassign) · volunteers CRUD + /status · shelters CRUD · agencies CRUD · resources CRUD + /quantity · alerts GET/POST · GET /analytics · GET /audit-logs · GET /checkins · missing matches GET + /review · damage assessments GET + /flag · hazards GET/POST/PATCH. Full request/response for every route: docs/API_CONTRACT.md.
4. FastAPI Route Table
Method	Route	Purpose
GET	/health	liveness
POST	/api/v1/damage-assessment/predict	ML inference contract {classification, confidence} (placeholder seam; real model drops into app/services/damage_service.py)
5. Frontend API Contract
Complete per-route contract (method, URL, auth, purpose, request/response, errors, calling frontend page) is in docs/API_CONTRACT.md. 31/31 live smoke checks passed against the running servers.
6. Realtime Events (ws://localhost:4000/ws)
system:connected, sos:new (+highPriority), report:new, report:update, report:assignment, report:resolution, dispatch:update, alert:new, volunteer:status, shelter:capacity. Subscribe: {action:"subscribe", channels:["admin"|"public"]}.
7. Environment Variables
NODE_ENV, PORT, HOST, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, ADMIN_EMAIL, ADMIN_PASSWORD, OPENROUTER_API_KEY (you provide), OPENROUTER_BASE_URL, OPENROUTER_MODEL, PFA_ESCAPE_MODE, DAMAGE_ML_BASE_URL, DAMAGE_ML_TIMEOUT_MS, CORS_ORIGINS, rate-limit vars, REALTIME_PATH, UPLOAD_MAX_SIZE_MB. All listed in .env.example.
8. External Services
- OpenRouter (free-tier LLM) — PFA chatbot. Free. Needs OPENROUTER_API_KEY.
- FastAPI damage service — self-hosted; real model weights to be supplied.
- PostgreSQL — Docker or local. No paid services used.
9. Run Commands
docker compose up -d postgres          # start PostgreSQL
npx prisma migrate deploy              # migrations (npm run prisma:deploy)
npm run db:seed                        # seed
npm run dev                            # Node backend  (:4000)
npm run fastapi:dev                    # FastAPI (:8001)
npm run test                           # vitest (Node)
npm run typecheck                      # tsc --noEmit
cd fastapi-service && python -m pytest tests -q
10. Verification (all green)
- tsc --noEmit ✓ · vitest run 21/21 ✓ · FastAPI pytest 3/3 ✓
- prisma validate ✓ · prisma migrate status up to date ✓ · tsc build ✓
- API smoke test 31/31 ✓ (incl. auth guard 401, bad login 401)
- Realtime WS streamed sos:new ✓ · damage pHash duplicate detection ✓
- scripts/check-exclusions.js — zero SAR/Sentinel/WebRTC/telemedicine references ✓
Note: with no OPENROUTER_API_KEY, the PFA returns its deterministic PRD protocols (box breathing / 5-4-3-2-1 grounding) as a degraded fallback; set the key to get real LLM replies. Add the existing damage model weights to fastapi-service/models/ to activate inference.