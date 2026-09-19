# AapdaSetu Backend

Disaster-management backend for the **AapdaSetu** platform — Node.js + TypeScript + Prisma 6 + PostgreSQL REST API with realtime WebSockets, a FastAPI ML-service interface for the existing damage-assessment model, and an OpenRouter-backed PFA chatbot.

> Source of truth: `PRD.md`, `flow.md`, `tech.md`, `backend_prompt.md` in this repo.

## Stack

- **Node.js 18+ / TypeScript** — Express 4, Zod validation, `ws` realtime, scrypt password hashing, JWT admin sessions
- **PostgreSQL 16** — Prisma 6, UUID PKs, enums, FKs, indexes, migrations
- **FastAPI** (`fastapi-service/`) — interface for the existing damage-classification model (placeholder inference until weights are provided)
- **OpenRouter** — PFA chatbot (free-tier models; credentials via env)

## Quick start

### 1. PostgreSQL

Docker (recommended):

```bash
docker compose up -d postgres
```

Or use an existing PostgreSQL and create the role/db:

```sql
CREATE ROLE aapdasetu LOGIN PASSWORD 'aapdasetu' CREATEDB;
CREATE DATABASE aapdasetu OWNER aapdasetu;
```

### 2. Configure

```bash
cp .env.example .env   # then fill in OPENROUTER_API_KEY, JWT_SECRET, etc.
```

### 3. Install + migrate + seed

```bash
npm install
npx prisma migrate deploy   # or: npm run prisma:migrate
npm run db:seed             # admin user, demo volunteers/agencies/shelters/reports
```

### 4. Run Node backend

```bash
npm run dev            # http://localhost:4000  (realtime at ws://localhost:4000/ws)
```

### 5. Run FastAPI ML service

```bash
pip install -r fastapi-service/requirements.txt
cd fastapi-service && uvicorn app.main:app --reload --port 8001   # or: npm run fastapi:dev
```

Or via Docker:

```bash
docker compose up -d ai-engine
```

### 6. Verify

```bash
npm run typecheck      # tsc --noEmit
npm run test           # vitest (Node unit tests)
npm run check:exclusions   # SAR / WebRTC / telemedicine scan
cd fastapi-service && python -m pytest tests -q
node scripts/smoke-test.mjs   # run with both servers up
```

## Default admin credentials

- Email: `admin@aapdasetu.org`
- Password: `Admin@123`

Change both via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars and update the password after first login.

## Key commands

| Task | Command |
|---|---|
| Start PostgreSQL | `docker compose up -d postgres` |
| Run migrations | `npx prisma migrate dev` (dev) / `npx prisma migrate deploy` (prod) |
| Seed database | `npm run db:seed` |
| Start Node backend | `npm run dev` |
| Start FastAPI | `npm run fastapi:dev` |
| Run tests | `npm run test` (Node) / `python -m pytest tests` (FastAPI) |
| Type check | `npm run typecheck` |
| Build | `npm run build` |

## Documentation

- Full frontend API contract: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)
- Product Requirements: [`docs/PRD.md`](docs/PRD.md)
- System Workflows: [`docs/flow.md`](docs/flow.md)
- Engineering Specification: [`docs/tech.md`](docs/tech.md)

---

## 📚 Core Open-Source Foundations & Citations

1. **BitChat Protocol (Permissionless Tech)**: [iOS](https://github.com/permissionlesstech/bitchat) / [Android](https://github.com/permissionlesstech/bitchat-android) — Offline P2P BLE/Wi-Fi Aware mesh protocol for SOS beacons.
2. **Project OSRM & OpenStreetMap**: [OSRM Engine](https://project-osrm.org/) & [OSM](https://www.openstreetmap.org/) — Turn-by-turn road network routing for flood-evacuation safe routes and responder dispatch.
3. **ESA Copernicus Sentinel-1 SAR & UN-SPIDER**: [Copernicus](https://dataspace.copernicus.eu/) & [UN-SPIDER](https://www.un-spider.org/advisory-support/recommended-practices/recommended-practice-flood-mapping) — All-weather synthetic aperture radar satellite flood extent segmentation and Otsu thresholding.
4. **Hugging Face ResNet-50 Damage Classifier & NDMA/SDRF Norms / WHO PFA**: [HF Model](https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment), [NDMA Guidelines](https://ndma.gov.in/), and [WHO PFA Standards](https://www.who.int/publications/i/item/9789241548205) — Post-disaster structural damage classification, statutory SDRF relief calculation, and trauma psychological first aid.

