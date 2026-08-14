You are the lead backend engineer for **AapdaSetu**.

Before writing code, thoroughly analyze these three specification files in the repository:

* `flow.md`
* `PRD.md`
* `tech.md`

Treat them as the primary source of truth for the system's features, flows, entities, and routes. Reconcile their implementation details where necessary, but do not silently remove functionality unless explicitly instructed below.

## OBJECTIVE

Build the complete production-ready backend for AapdaSetu according to the three documents.

Use:

* Node.js
* TypeScript
* PostgreSQL
* **Prisma 6**
* REST APIs
* WebSockets/realtime where required
* Zod validation
* Docker-compatible PostgreSQL
* FastAPI for the ML-service interface
* OpenRouter for the PFA LLM

Do not use Prisma 7.

Do not use Supabase as the backend/API layer. Replace the Supabase-specific backend architecture from the documents with our own Node.js + PostgreSQL + Prisma 6 implementation.

---

## IMPORTANT EXCLUSIONS

Completely remove/ignore these features from the entire repository:

* Satellite SAR engine
* Sentinel-1
* Satellite flood mapping
* `satellite_flood_mapping.py`
* WebRTC
* Telemedicine
* Video consultation/telemedicine functionality

Search the entire repository and remove any related routes, services, controllers, imports, models, dependencies, environment variables, documentation and dead code.

Do not leave references to these features in the final implementation.

---

# AI / ML REQUIREMENTS

There are exactly three AI/ML decisions for V1.

## 1. PFA CHATBOT — ACTUAL LLM THROUGH OPENROUTER

The PFA chatbot MUST use an actual LLM.

Implement the PFA chatbot using OpenRouter.

Do not replace it with hardcoded responses.

Create a clean AI service abstraction so the model/provider can be changed later.

The PFA service should support the behavior described in the PRD:

* panic/hyperventilation
* box breathing
* 5-4-3-2-1 grounding
* general distress
* empathetic support
* emergency escalation

Use structured output where practical:

{
"message": "...",
"intent": "...",
"escalationRequired": false
}

Use environment variables for OpenRouter credentials/model.

I will provide credentials later. Do not block implementation waiting for credentials.

Only use free/non-paid services/models.

---

## 2. DAMAGE ASSESSMENT — EXISTING ML MODEL

The Damage Assessment ML model is ALREADY BUILT.

Do NOT train another model.

Do NOT implement the ML model.

Do NOT create fake ML inference logic.

Instead, implement the backend integration/interface for the existing model.

Create a FastAPI ML-service interface/placeholder with the expected route and request/response contract.

The actual model inference logic will be provided separately.

The Node backend should communicate with this FastAPI service.

The expected model output should support:

{
"classification": "MINOR_DAMAGE | MAJOR_STRUCTURAL_DAMAGE | FULLY_DESTROYED",
"confidence": 0.0
}

The backend should still implement the deterministic parts described in the specification:

* image validation
* EXIF extraction
* GPS verification
* perceptual hash / duplicate detection
* compensation calculation
* persistence

Architecture:

Frontend
→ Node.js Backend
→ FastAPI Damage ML Service
→ Existing ML Model

Keep the ML integration isolated behind a service/client interface.

---

## 3. MISSING PERSON MATCHING — DETERMINISTIC V1

Do NOT build an ML model for missing-person matching.

Implement V1 deterministically using the available information from the specifications:

* name
* age
* description
* location
* timestamps
* other available descriptors

Normalize and compare candidate records and produce a matching/ranking score.

Design the service so ML/embeddings can be introduced later without changing the public API.

---

# BACKEND IMPLEMENTATION

Build modules based on the actual features in the three documents, including:

* Admin authentication
* SOS
* Incident reports
* Incident tracking
* Explainable triage
* Safety check-ins
* Shelter management
* Nearby shelter search
* Public alerts
* PFA chatbot
* Damage assessment
* Missing persons
* Safe routes
* Volunteers
* Agencies
* Resources
* Dispatch/assignment
* Analytics
* Audit logs
* Realtime incident/alert updates

Use modular architecture.

Business logic must live in services, not inside route handlers.

Use:

Route → Controller/Handler → Service → Prisma

For external systems:

Service → Adapter/Client → External Service

---

# TRIAGE

Keep the existing triage algorithm from the specification.

It is deterministic/rule-based.

Do NOT replace it with ML.

Preserve:

* base score
* emergency-type weighting
* keyword weighting
* demographic vulnerability boosts
* medical-condition boosts
* score clamping
* RED/YELLOW/GREEN classification
* explainable scoring factors

---

# FASTAPI

Create the FastAPI service structure specifically for the existing ML integration.

The actual ML logic will be provided separately.

Implement the route/interface, schemas, validation, health endpoint, and placeholder service layer.

At minimum provide a route equivalent to:

POST /api/v1/damage-assessment/predict

Request should accept the required image/input for the existing damage model.

Response should follow the agreed prediction contract:

{
"classification": "MINOR_DAMAGE | MAJOR_STRUCTURAL_DAMAGE | FULLY_DESTROYED",
"confidence": 0.0
}

Also provide:

GET /health

Keep the actual inference implementation behind a clearly marked placeholder/service boundary.

Do not invent a model.

---

# DATABASE

Design the Prisma 6 schema from the three specification files.

At minimum account for:

* reports
* volunteers
* shelters
* agencies
* resources
* alerts
* audit_logs
* safety_checkins

Add supporting entities only where required.

Use proper:

* UUIDs
* enums
* foreign keys
* relations
* indexes
* timestamps
* constraints

Create Prisma migrations.

Create Docker PostgreSQL setup.

---

# SECURITY

Citizens must NOT require authentication.

Public functionality should remain zero-friction as specified.

Admin functionality must be protected.

Implement secure admin authentication, authorization, password hashing, rate limiting, validation, CORS, security headers, and audit logging.

Do not expose secrets.

---

# REALTIME

Do not use Supabase Realtime.

Implement realtime through the Node backend.

Support events for important flows such as:

* new SOS
* new report
* report update
* report assignment
* report resolution
* new alert
* alert update
* volunteer status
* shelter capacity

RED SOS events should be distinguishable as high priority.

---

# EXTERNAL SERVICES / CREDENTIALS

Do NOT artificially restrict implementation because credentials are unavailable.

I will provide the required credentials/configuration.

Use environment variables and sensible placeholders.

However:

**Do not use paid services.**

Prefer free/open-source services wherever an external service is required.

Potential configuration includes:

* PostgreSQL
* OpenRouter
* existing Damage Assessment FastAPI service
* routing provider
* notification providers if required

If an integration requires credentials, implement the integration and record the required credential in the final report.

Do not hardcode credentials.

---

# FRONTEND API CONTRACT

After implementation, produce a complete frontend-facing API contract.

For EVERY route, document:

1. HTTP method
2. URL
3. Authentication requirement
4. Purpose
5. Request body/query/path parameters
6. Example request
7. Example response
8. Possible errors
9. Which frontend feature/page calls it

Group routes by:

* Public Citizen APIs
* Admin APIs
* Realtime/WebSocket APIs
* FastAPI ML APIs

Make the contract directly usable by the frontend team.

For example:

POST /api/v1/reports/sos

Request:
{
"latitude": 20.2,
"longitude": 85.8,
"type": "fire",
"description": "..."
}

Response:
{
"success": true,
"data": {
"trackingId": "...",
"priorityScore": 85,
"priorityLabel": "RED"
}
}

Do this for every frontend-facing route.

---

# FINAL OUTPUT REQUIRED

After implementation, do NOT just say "done".

Provide:

### 1. Architecture summary

Explain the final Node.js + Prisma + PostgreSQL + FastAPI + OpenRouter architecture.

### 2. Database summary

List all Prisma models and important relationships.

### 3. Node.js API routes

Give the complete route table.

### 4. FastAPI routes

Give the complete ML-service route table.

### 5. Frontend API contract

For every frontend-callable route, provide:

* method
* URL
* request
* response
* authentication
* frontend page/module using it

### 6. Realtime events

List all WebSocket events and their payloads.

### 7. Required credentials/environment variables

Give a clean list of every environment variable required.

Do NOT ask me for the credentials now.

### 8. External services

List every external/free service used and why.

### 9. Run commands

Give exact commands to:

* start PostgreSQL
* run migrations
* seed database
* start Node backend
* start FastAPI
* run tests
* run type checking

### 10. Verification

Before finishing:

* run TypeScript type checking
* run tests
* validate Prisma schema
* validate migrations
* verify API routes
* verify FastAPI routes
* search the repository for SAR/WebRTC/telemedicine references
* remove any remaining excluded-feature references
* fix obvious implementation errors

Do not stop at scaffolding. Implement the actual backend.
