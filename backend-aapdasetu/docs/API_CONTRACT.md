# AapdaSetu — Frontend API Contract

Base URL (dev): `http://localhost:4000`
Realtime (WebSocket): `ws://localhost:4000/ws`
ML service (FastAPI, dev): `http://localhost:8001`

All responses use the envelope:

```json
{ "success": true, "data": ... }
```

Errors:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "...", "details?": ... }
}
```

---

## A. Public Citizen APIs (no authentication)

### A1. 1-Tap SOS
- **Method / URL:** `POST /api/v1/sos`
- **Auth:** none
- **Purpose:** Instant SOS trigger with geolocation; auto AI triage → RED/YELLOW/GREEN.
- **Request:**
  ```json
  {
    "type": "flood",
    "latitude": 20.31,
    "longitude": 85.84,
    "description": "Family trapped on roof, water rising",
    "landmark": "Near temple",
    "reporterName": "Amit",
    "reporterPhone": "+91-9000000000",
    "medicalCondition": "pregnant",
    "bloodType": "O+",
    "mediaData": "<base64>",
    "mediaType": "video"
  }
  ```
- **Response 201:**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "trackingId": "cmss...",
      "type": "flood",
      "status": "pending",
      "priorityScore": 95,
      "priorityLabel": "RED",
      "latitude": 20.31,
      "longitude": 85.84,
      "hasMedia": true,
      "triage": {
        "score": 95,
        "label": "RED",
        "factors": [{ "rule": "TYPE_BASE", "points": 15 }, { "rule": "KEYWORD", "points": 30, "matched": "trapped" }]
      }
    }
  }
  ```
- **Errors:** 400 validation (`INVALID_COORDS`), 429 rate limit.

### A2. Incident Report Form
- **Method / URL:** `POST /api/v1/reports`
- **Auth:** none
- **Purpose:** Full multi-step report for 7 incident types (fire, flood, medical, missing_person, earthquake, accident, other).
- **Request:** same as A1 plus:
  ```json
  {
    "missingPersonName": "Anita Sahoo",
    "missingPersonAge": 9,
    "missingPersonDesc": "Red dress, last seen at market"
  }
  ```
- **Response 201:** report object with `trackingId`, `priorityScore`, `priorityLabel`, `triage`.
- **Errors:** 400 validation, 429.

### A3. Incident Tracking ID Lookup
- **Method / URL:** `GET /api/v1/reports/track/:trackingId`
- **Auth:** none
- **Purpose:** Real-time status timeline for a citizen's tracking ID.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid", "trackingId": "cmss...", "type": "flood", "status": "in_progress",
      "priorityScore": 95, "priorityLabel": "RED",
      "assignedVolunteer": { "id": "uuid", "name": "Rakesh Mohanty", "phone": "+91-9000000001", "status": "on_duty" },
      "assignedAgency": { "id": "uuid", "name": "NDRF Bhubaneswar", "type": "ndrf" },
      "resolutionNotes": null,
      "createdAt": "2026-08-14T02:03:14.574Z"
    }
  }
  ```
- **Errors:** 404 `NOT_FOUND`.

### A4. Safety Check-In
- **Method / URL:** `POST /api/v1/checkins`
- **Auth:** none
- **Purpose:** Register "Safe" / "Need Assistance".
- **Request:**
  ```json
  { "fullName": "Amit", "phone": "+91-...", "locationName": "Janata Maidan", "status": "safe", "latitude": 20.2686, "longitude": 85.8327, "notes": "" }
  ```
- **Response 201:** `data: { id, fullName, status, createdAt, ... }`.

### A5. Nearby Shelter Finder
- **Method / URL:** `GET /api/v1/shelters/nearby?latitude=20.27&longitude=85.83&radiusKm=10`
- **Auth:** none
- **Purpose:** Shelters sorted by exact Haversine distance.
- **Response:**
  ```json
  {
    "success": true,
    "data": [{
      "id": "uuid", "name": "Janata Maidan Relief Shelter", "address": "...",
      "latitude": 20.2686, "longitude": 85.8327,
      "capacity": 500, "occupancy": 0, "capacityAvailable": 500,
      "facilities": ["food", "water", "medical_station"],
      "contactPhone": "+91-...", "status": "open",
      "distanceKm": 0.42,
      "resources": [{ "id": "uuid", "name": "Water", "category": "water", "quantity": 2000, "unit": "bottles" }]
    }]
  }
  ```

### A6. Live Public Warnings
- **Method / URL:** `GET /api/v1/alerts`
- **Auth:** none
- **Purpose:** Latest alert banners (severity: info | warning | critical).
- **Response:** `data: [{ id, title, message, severity, channel, targetArea, createdAt }]`
- Realtime variant: subscribe to `public` channel → `alert:new` events.

### A7. PFA Chatbot
- **Method / URL:** `POST /api/v1/pfa/chat`
- **Auth:** none
- **Purpose:** Psychological first aid via OpenRouter LLM; box breathing / 5-4-3-2-1 grounding / escalation.
- **Request:**
  ```json
  { "message": "I can't breathe, I'm panicking", "history": [{ "role": "user", "content": "..." }] }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "message": "Let's breathe together. Inhale 4s, hold 4s, exhale 4s, hold 4s...",
      "intent": "panic_hyperventilation",
      "escalationRequired": false,
      "protocol": "box_breathing"
    }
  }
  ```
- **Also:** `GET /api/v1/pfa/health` → `{ openRouterConfigured: boolean }`.

### A8. Damage Assessment (Anti-Fraud)
- **Method / URL:** `POST /api/v1/damage-assessment`
- **Auth:** none
- **Purpose:** Photo damage evidence → EXIF/GPS verify, pHash dedup, ML classification, SDRF compensation.
- **Request:**
  ```json
  {
    "imageBase64": "<base64 image>",
    "mimeType": "image/jpeg",
    "reportedLatitude": 20.3,
    "reportedLongitude": 85.83,
    "reportId": "uuid?",
    "reporterName": "Amit?",
    "reporterPhone": "+91-...?"
  }
  ```
- **Response 201:**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "classification": "MINOR_DAMAGE",
      "confidence": 0.0,
      "compensation": 9800,
      "locationVerified": false,
      "locationDistanceM": null,
      "duplicate": false,
      "imageHash": "phash:ff...",
      "status": "approved"
    }
  }
  ```
- **Errors:** 400 `BAD_REQUEST` (bad image), 503 `SERVICE_UNAVAILABLE` (ML down — still returns MINOR fallback), 429.

### A9. Missing Person Matching
- **Method / URL:** `POST /api/v1/missing/matches`
- **Auth:** none
- **Purpose:** Deterministic match ranking for a missing-person report.
- **Request:** `{ "reportId": "uuid", "threshold": 0.2 }`
- **Response:**
  ```json
  {
    "success": true,
    "data": [{
      "candidate": { "reportId": "uuid", "name": "...", "age": 9, "latitude": 20.27, "longitude": 85.83, "createdAt": "..." },
      "score": 0.9,
      "reasons": [{ "factor": "name_exact", "weight": 0.35, "evidence": "anita sahoo" }]
    }]
  }
  ```

### A10. Safe Routes / Hazards
- **Method / URL:** `GET /api/v1/safe-routes/hazards`
- **Auth:** none
- **Purpose:** Active flood polygons / blocked underpasses (GeoJSON geometry) for the Leaflet map.
- **Response:** `data: [{ id, type, name, geometry, description, active }]`
- **Method / URL:** `POST /api/v1/safe-routes/reroute`
- **Request:** `{ "latitude": 20.3, "longitude": 85.83, "hazardId": "uuid?" }`
- **Response:** avoidance zones + safe reroute suggestion.

---

## B. Admin APIs (Bearer JWT, stored under `aapdasetu_admin_session`)

### B1. Admin Login
- **Method / URL:** `POST /api/v1/admin/auth/login`
- **Auth:** none (rate-limited)
- **Request:** `{ "email": "admin@aapdasetu.org", "password": "Admin@123" }`
- **Response:**
  ```json
  { "success": true, "data": { "token": "<jwt>", "admin": { "id": "uuid", "email": "...", "name": "...", "role": "admin" } } }
  ```
- **Errors:** 401 `UNAUTHORIZED` (bad credentials), 429.

### B2. Current Admin / Change Password
- `GET /api/v1/admin/auth/me` → `{ id, email, name, role, lastLoginAt }`
- `POST /api/v1/admin/auth/change-password` → `{ currentPassword, newPassword }`

### B3. Overview / KPIs
- **Method / URL:** `GET /api/v1/admin/overview`
- **Purpose:** Command center header gauge + KPI cards.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "kpis": {
        "totalReports": 5, "activeRed": 2, "openShelters": 2, "availableVolunteers": 3,
        "activeAgencies": 4, "pendingReports": 2, "inProgressReports": 1, "resolvedReports": 1,
        "totalCheckins": 2, "avgPriorityScore": 71.25, "crisisGaugeScore": 45
      },
      "latestReports": [ { "id": "uuid", "trackingId": "...", "type": "flood", "status": "pending", "priorityLabel": "RED", "latitude": 20.31, "longitude": 85.84, "assignedVolunteer": { "id": "uuid", "name": "..." }, "assignedAgency": { "id": "uuid", "name": "..." } } ]
    }
  }
  ```

### B4. Incident Reports Management
- **Method / URL:** `GET /api/v1/admin/reports?status=pending&type=flood&priorityLabel=RED&search=roof&page=1&pageSize=50`
- **Purpose:** Search/filter/triage grid.
- **Response:** `{ items: [...reports with assignedVolunteer/assignedAgency], total, page, pageSize }`
- **Method / URL:** `GET /api/v1/admin/reports/:id` → full detail.
- **Method / URL:** `PATCH /api/v1/admin/reports/:id/status`
  ```json
  { "status": "in_progress", "resolutionNotes": "Unit dispatched" }
  ```
- **Method / URL:** `POST /api/v1/admin/reports/:id/assign`
  ```json
  { "volunteerId": "uuid", "agencyId": "uuid" }
  ```
  (At least one optional; sets volunteer on_duty, report → in_progress.)
- **Method / URL:** `POST /api/v1/admin/reports/:id/unassign`
  ```json
  { "target": "volunteer" }
  ```

### B5. Live SOS Stream (realtime)
- **Purpose:** Live stream of incoming SOS. Subscribe to `admin` channel. RED events carry `highPriority: true` → trigger sound alarm.
- **Connect:** `ws://localhost:4000/ws` → send `{ "action": "subscribe", "channels": ["admin"] }`.

### B6. Volunteers
- `GET /api/v1/admin/volunteers?status=available&skill=medical`
- `POST /api/v1/admin/volunteers` → `{ name, phone, skills[], latitude?, longitude?, status? }`
- `PATCH /api/v1/admin/volunteers/:id` → partial update
- `PATCH /api/v1/admin/volunteers/:id/status` → `{ "status": "available|on_duty|offline" }`

### B7. Shelters
- `GET /api/v1/admin/shelters`
- `GET /api/v1/admin/shelters/:id`
- `POST /api/v1/admin/shelters` → `{ name, address, latitude, longitude, capacity, facilities[], contactPhone?, status? }`
- `PATCH /api/v1/admin/shelters/:id` → partial incl. `occupancy`, `status` (broadcasts `shelter:capacity`).

### B8. Agencies
- `GET /api/v1/admin/agencies?type=ndrf`
- `POST /api/v1/admin/agencies` → `{ name, type, contactPhone?, contactEmail?, jurisdiction?, latitude?, longitude? }`
- `PATCH /api/v1/admin/agencies/:id`

### B9. Resources
- `GET /api/v1/admin/resources?shelterId=uuid&category=water`
- `POST /api/v1/admin/resources` → `{ name, category, quantity, unit, shelterId? }`
- `PATCH /api/v1/admin/resources/:id/quantity` → `{ "quantity": 100 }`

### B10. Alert Broadcaster
- `GET /api/v1/admin/alerts`
- `POST /api/v1/admin/alerts` → `{ title, message, severity, channel?, targetArea? }` (broadcasts `alert:new`).

### B11. Crisis Analytics
- **Method / URL:** `GET /api/v1/admin/analytics?rangeDays=14`
- **Response:** `{ byType[], byPriority[], byStatus[], trendsByDay[], geographic[], avgResponseMinutes, shelterUtilization[], volunteerStatus[], checkinsByStatus[], damageSummary[] }`

### B12. Audit Logs
- **Method / URL:** `GET /api/v1/admin/audit-logs?page=1&pageSize=50&adminEmail=&action=`
- **Response:** `{ items: [{ id, adminEmail, action, entityType, entityId, details, createdAt }], total, page, pageSize }`

### B13. Safety Check-ins (admin)
- `GET /api/v1/admin/checkins?status=need_assistance`

### B14. Missing Person Registry
- `GET /api/v1/admin/missing/matches?status=pending`
- `POST /api/v1/admin/missing/matches/:id/review` → `{ "status": "confirmed|rejected" }`

### B15. Damage Assessments (admin)
- `GET /api/v1/admin/damage-assessments?page=1&pageSize=50`
- `POST /api/v1/admin/damage-assessments/:id/flag` → marks duplicate fraud.

### B16. Route Hazards (admin)
- `GET /api/v1/admin/hazards`
- `POST /api/v1/admin/hazards` → `{ type, name?, geometry (GeoJSON), description?, active? }`
- `PATCH /api/v1/admin/hazards/:id` → `{ "active": false }`

---

## C. Realtime / WebSocket API

Endpoint: `ws://localhost:4000/ws`

Control frame:
```json
{ "action": "subscribe", "channels": ["admin"] }   // admin | public (default: public)
```

### Events (see section on realtime events in final report)
| Event | Channel | Payload |
|---|---|---|
| `system:connected` | both | connection confirmation / subscription list |
| `sos:new` | admin | report + `highPriority` (RED) |
| `report:new` | admin | report |
| `report:update` | admin | report |
| `report:assignment` | admin | report w/ assigned entities |
| `report:resolution` | admin | report |
| `dispatch:update` | admin | report |
| `alert:new` | admin + public | alert |
| `volunteer:status` | admin | `{ id, name, status }` |
| `shelter:capacity` | public | `{ id, name, status, occupancy, capacity, capacityAvailable }` |

---

## D. FastAPI ML APIs

Base URL (dev): `http://localhost:8001`

### D1. Health
- `GET /health` → `{ "status": "ok", "service": "aapdasetu-ai-engine", "timestamp": null }`

### D2. Damage Prediction
- `POST /api/v1/damage-assessment/predict`
- **Request:**
  ```json
  {
    "imageBase64": "<base64>",
    "mimeType": "image/jpeg",
    "metadata": { "reportedLatitude": 20.3, "reportedLongitude": 85.83, "exifLatitude": null, "exifLongitude": null, "imageHash": "..." }
  }
  ```
- **Response:**
  ```json
  { "classification": "MINOR_DAMAGE", "confidence": 0.0 }
  ```
- **Errors:** 422 invalid payload. (Inference placeholder until the real model weights are provided.)
