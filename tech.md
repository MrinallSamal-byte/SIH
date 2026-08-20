# 🛠️ AapdaSetu — Technical Architecture, Data Contracts & Engineering Guide

> **Comprehensive engineering specification of AapdaSetu's multi-stack architecture, clean code patterns, data contracts, Prisma 6 PostgreSQL models, AI microservices, mathematical algorithms, and security policies.**

---

## 📑 Table of Contents
1. [Architectural Principles & Patterns](#1-architectural-principles--patterns)
2. [Frontend Architecture & Design Tokens](#2-frontend-architecture--design-tokens)
3. [Realtime Event Bus & State Synchronization](#3-realtime-event-bus--state-synchronization)
4. [Mathematical & Algorithmic Specifications](#4-mathematical--algorithmic-specifications)
5. [Prisma 6 Database Schema Specification](#5-prisma-6-database-schema-specification)
6. [AI Microservice Engine Specifications](#6-ai-microservice-engine-specifications)
7. [API Contract & Schema References](#7-api-contract--schema-references)
8. [Offline PWA & Mesh Architecture](#8-offline-pwa--mesh-architecture)
9. [Security, RLS & Compliance](#9-security-rls--compliance)

---

## 1. Architectural Principles & Patterns

AapdaSetu adheres to modern clean architecture and event-driven design principles to ensure mission-critical resilience:

- **Hexagonal Architecture (Ports & Adapters):** Core domain business logic (triage calculation, geospatial proximity, PFA protocols) is decoupled from delivery mechanisms (HTTP REST, WebSockets, Mock fallbacks).
- **Graceful Degradation & Zero-Dependency Demo Mode:** Every client-side API adapter implements an automatic in-memory mock fallback (`src/api/mocks.ts`). If the backend server or AI microservice is unreachable, the client operates in high-fidelity mock mode without throwing unhandled exceptions.
- **Zero-Authentication Citizen Layer:** Zero friction for emergency users; all citizen endpoints require no prior registration or credentials.
- **Strict TypeScript Typing:** Full type safety across both frontend and backend models, eliminating runtime type errors during emergency operations.

---

## 2. Frontend Architecture & Design Tokens

### 2.1 Technology Stack
- **Framework:** React 19 with Vite 6 SPA bundling.
- **Routing:** React Router v6 using hash-based routing (`#/sos`, `#/admin`, `#/volunteer`) for compatibility with static CDNs and offline environments.
- **Styling:** Tailwind CSS 3.4 with custom design tokens, dark/light theme switching via CSS variables, and Lucide React iconography.
- **GIS Mapping:** Leaflet.js 1.9 & React-Leaflet 5 with OpenStreetMap / CARTO tile rendering and custom SVG marker pins.
- **Visualizations:** Recharts 3 for incident analytics, priority distribution, and response time telemetry.

### 2.2 Design System Tokens & Color Palette
```css
/* Color Palette Specifications */
--color-brand-primary: #0f172a;       /* Slate 900 */
--color-brand-accent: #dc2626;        /* Emergency Red 600 */
--color-brand-warning: #d97706;       /* Amber 600 */
--color-brand-success: #16a34a;       /* Emerald 600 */
--color-brand-info: #2563eb;          /* Royal Blue 600 */

/* Priority Badge Semantics */
--priority-red: #ef4444;              /* RED Alert: Critical Threat (Score >= 80) */
--priority-yellow: #f59e0b;           /* YELLOW Alert: Urgent Response (50 <= Score < 80) */
--priority-green: #10b981;            /* GREEN Alert: Advisory / Standard (Score < 50) */
```

### 2.3 Internationalization (`i18n.tsx`)
A custom context provider supporting 4 languages with variable interpolation and fallback protection:
- **English (`en`)**
- **Hindi (`hi` — हिंदी)**
- **Bengali (`bn` — বাংলা)**
- **Odia (`or` — ଓଡ଼ିଆ)**

---

## 3. Realtime Event Bus & State Synchronization

The frontend implements a lightweight, pub-sub `RealtimeEventBus` (`src/lib/realtimeEventBus.ts`) that manages cross-component and cross-tab communication:

```typescript
export type RealtimeEventType =
  | 'incident:created'
  | 'incident:updated'
  | 'volunteer:dispatched'
  | 'shelter:capacity_changed'
  | 'alert:broadcast'
  | 'damage:claim_submitted'
  | 'checkin:posted'

export interface RealtimeEvent<T = any> {
  id: string
  type: RealtimeEventType
  timestamp: number
  payload: T
}
```

Components subscribe using the `useRealtime` hook:
```typescript
useRealtime({
  onIncidentCreated: (incident) => {
    if (incident.priorityLabel === 'RED') {
      playEmergencySiren()
      flashMapMarker(incident.location)
    }
  }
})
```

---

## 4. Mathematical & Algorithmic Specifications

### 4.1 Haversine Distance Formula (Great-Circle Distance)
Used for computing geodesic distance between citizen coordinates $(\text{lat}_1, \text{lng}_1)$ and shelter coordinates $(\text{lat}_2, \text{lng}_2)$:

$$d = 2R \cdot \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)} \right)$$

Where:
- $R = 6371.0\text{ km}$ (Earth's mean radius)
- $\Delta \text{lat} = (\text{lat}_2 - \text{lat}_1) \cdot \frac{\pi}{180}$
- $\Delta \text{lng} = (\text{lng}_2 - \text{lng}_1) \cdot \frac{\pi}{180}$

### 4.2 Multi-Factor AI Triage Urgency Scoring Formula
$$P_{\text{total}} = \text{clamp}\left( 1, 100, S_{\text{base}} + W_{\text{type}} + \sum W_{\text{nlp}} + W_{\text{demo}} + W_{\text{gps}} \right)$$

Where:
- $S_{\text{base}} = 30$ (Base initialization score)
- $W_{\text{type}} \in [5, 25]$: Category weight (Earthquake = $+25$, Fire = $+20$, Flood/Medical = $+18$)
- $\sum W_{\text{nlp}} \in [0, 40]$: Sum of detected crisis keywords across multi-lingual dictionaries
- $W_{\text{demo}} \in [0, 30]$: Vulnerability points (Infant/Child = $+25$, Senior = $+20$, Pregnancy = $+30$)
- $W_{\text{gps}} \in [0, 5]$: High-accuracy GPS verification bonus
- $\text{clamp}(a, b, x) = \max(a, \min(b, x))$

### 4.3 Perceptual Hash (pHash) Anti-Fraud Duplicate Detection
For property damage assessment, images are converted to 64-bit perceptual hashes. Two photos $H_1$ and $H_2$ are deemed duplicate/fraudulent if their Hamming distance $D_H$ satisfies:

$$D_H(H_1, H_2) = \sum_{i=1}^{64} (H_{1,i} \oplus H_{2,i}) < 5$$

---

## 5. Prisma 6 Database Schema Specification

The backend models are defined in `backend-aapdasetu/prisma/schema.prisma`:

```prisma
enum IncidentType {
  fire
  flood
  medical
  missing_person
  earthquake
  accident
  other
}

enum IncidentStatus {
  pending
  in_progress
  resolved
}

enum PriorityLabel {
  RED
  YELLOW
  GREEN
}

model Incident {
  id               String         @id @default(uuid())
  trackingId       String         @unique @map("tracking_id")
  type             IncidentType
  status           IncidentStatus @default(pending)
  priorityScore    Int            @map("priority_score")
  priorityLabel    PriorityLabel  @map("priority_label")
  latitude         Float
  longitude        Float
  landmark         String?
  reporterName     String?        @map("reporter_name")
  reporterPhone    String         @map("reporter_phone")
  description      String?
  triageFactors    Json?          @map("triage_factors")
  mediaUrl         String?        @map("media_url")
  isOneTapSos      Boolean        @default(false) @map("is_one_tap_sos")
  assignedVolunteer Volunteer?    @relation(fields: [assignedVolunteerId], references: [id])
  assignedVolunteerId String?     @map("assigned_volunteer_id")
  assignedAgency   Agency?        @relation(fields: [assignedAgencyId], references: [id])
  assignedAgencyId String?        @map("assigned_agency_id")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  @@index([status, priorityLabel])
  @@index([latitude, longitude])
  @@map("incidents")
}
```

---

## 6. AI Microservice Engine Specifications

### 6.1 `triage.py` (FastAPI `/ai/triage`)
- Evaluates raw text and telemetry payloads to compute explainable triage factor breakdowns.
- Exposes REST endpoint accepting `{ type, description, demographics, location }` and returning `{ score, priority_label, factors }`.

### 6.2 `damage_service.py` (FastAPI `/ai/damage-assessment`)
- Processes base64 or multipart images through a PyTorch / OpenCV structural defect classifier.
- Extracts EXIF metadata, computes pHash, and outputs SDRF compensation tiers:
  - **Grade 1 (Total Collapse):** ₹1,20,000
  - **Grade 2 (Severe Damage):** ₹65,000
  - **Grade 3 (Minor Damage):** ₹25,000

### 6.3 `satellite_flood_mapping.py` (FastAPI `/ai/satellite-flood-map`)
- Ingests Sentinel-1 SAR radar backscatter data ($VV / VH$ polarization).
- Applies Otsu thresholding to extract water surface masks and converts binary masks into GeoJSON MultiPolygon layers for Leaflet map avoidance.

### 6.4 `pfa_chatbot.py` (FastAPI `/ai/pfa-chat`)
- Implements evidence-based Psychological First Aid (PFA) protocols.
- Detects acute stress reactions and guides victims through interactive 4-4-4 Box Breathing and 5-4-3-2-1 Sensory Grounding exercises.

---

## 7. API Contract & Schema References

### 7.1 Create Emergency Incident
- **Method:** `POST /api/reports`
- **Request Body:**
```json
{
  "type": "flood",
  "isOneTapSos": false,
  "reporterName": "Rahul Sharma",
  "reporterPhone": "9876543210",
  "description": "Water rising rapidly on 1st floor, 2 senior citizens trapped",
  "location": { "lat": 20.2961, "lng": 85.8245, "landmark": "Near Unit-1 Market" },
  "mediaUrl": "data:image/jpeg;base64,..."
}
```
- **Response (`201 Created`):**
```json
{
  "id": "c836f414-181d-4463-bd4d-efdf8e7b950d",
  "trackingId": "SOS-7K2X9",
  "status": "pending",
  "priorityScore": 88,
  "priorityLabel": "RED",
  "triageFactors": [
    "Base emergency initialization: +30",
    "Flood emergency category: +18",
    "Keyword 'trapped' matched: +30",
    "Keyword 'water rising' matched: +20",
    "Demographic 'senior citizen' detected: +20"
  ],
  "createdAt": "2026-08-17T22:38:45.000Z"
}
```

---

## 8. Offline PWA & Mesh Architecture

1. **Service Worker (`public/sw.js`):**
   - Intercepts fetch requests with a **Network First, Cache Fallback** strategy for APIs and a **Cache First** strategy for static assets (Leaflet tiles, icons, CSS/JS bundles).
   - Queues offline `POST /api/reports` submissions into IndexedDB (`aapdasetu_offline_queue`) and triggers background synchronization on network restoration.

2. **BitChat BLE Mesh Integration (`bitchat-android`):**
   - Implements zero-infrastructure Bluetooth Low Energy (BLE) peripheral advertising and central scanning.
   - Floods 256-byte encrypted emergency packets across multi-hop peer nodes until an internet-connected gateway node relays them to the AapdaSetu Command Center.

---

## 9. Security, RLS & Compliance

- **CORS & Rate Limiting:** Configured on Express and FastAPI gateways to prevent Denial of Service (DoS) during traffic surges.
- **Bcrypt Password Hashing:** Applied to admin and volunteer credential authentication.
- **Anti-Fraud EXIF & Geo-Fencing:** Prevents false damage claims filed outside active disaster zones.
- **Audit Logging:** Every administrative dispatch, priority adjustment, and status update generates an immutable timestamped record in `audit_logs`.
