# 🛡️ AapdaSetu (आपदासेतु / આપદાસେતુ / ଆପଦାସେତୁ / आपदाসেতু)

> **The Ultimate Disaster Response, AI Triage, and Multi-Agency Incident Command Ecosystem.**  
> *Architected with React 19, TypeScript, Vite 6, Tailwind CSS, Leaflet.js GIS + OSRM Road Routing, Realtime Event Bus, Prisma 6 PostgreSQL, FastAPI AI Microservices, and Offline-First PWA.*

[![Initiative](https://img.shields.io/badge/Initiative-SIH%20Disaster%20Management-orange.svg)](https://github.com/MrinallSamal-byte/SIH)
[![Web Architecture](https://img.shields.io/badge/Architecture-React%2019%20%2B%20TypeScript%20%2B%20FastAPI%20AI-blue.svg)](https://github.com/MrinallSamal-byte/SIH)
[![PWA Ready](https://img.shields.io/badge/PWA-Service%20Worker%20%2B%20Offline%20Ready-emerald.svg)](https://github.com/MrinallSamal-byte/SIH)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📑 Table of Contents
1. [🌐 Live Deployments & Repositories](#-live-deployments--repositories)
2. [📌 Executive Overview](#-executive-overview)
3. [🏗️ Master System Architecture & Complete User Journey](#️-master-system-architecture--complete-user-journey)
4. [📱 Comprehensive Citizen (User) Features](#-comprehensive-citizen-user-features)
5. [🚨 Comprehensive Command Center (Admin) Features](#-comprehensive-command-center-admin-features)
6. [🧑‍🚒 Comprehensive Field Responder (Volunteer) Features](#-comprehensive-field-responder-volunteer-features)
7. [🧠 AI Microservice Engine & Algorithms](#-ai-microservice-engine--algorithms)
8. [📡 Offline PWA & Decentralized BLE Mesh](#-offline-pwa--decentralized-ble-mesh)
9. [🗄️ Database Architecture & Data Models](#️-database-architecture--data-models)
10. [🛠️ Technology Stack](#️-technology-stack)
11. [📁 Repository Directory Structure](#-repository-directory-structure)
12. [🚦 Getting Started & Local Development](#-getting-started--local-development)
13. [📜 License & Acknowledgments](#-license--acknowledgments)

---

## 🌐 Live Deployments & Repositories

- **Live Web Application:** [https://sih-ochre-xi.vercel.app/](https://sih-ochre-xi.vercel.app/)
- **Local Dev Server:** `http://localhost:5173/` (Vite) + `http://localhost:4000` (Express) + `http://localhost:8080` (FastAPI AI)
- **One-Command Dev:** `npm run dev` (concurrently runs frontend + backend)
- **GitHub Repository:** [https://github.com/MrinallSamal-byte/SIH](https://github.com/MrinallSamal-byte/SIH)

---

## 📌 Executive Overview

During cyclones, flash floods, earthquakes, and industrial explosions, public helplines collapse under telecom congestion, servers crash, and citizens face language barriers and fake bot replies.

**AapdaSetu** solves the last-mile gap with:
1. **Zero-Auth Citizen Portal:** 1-Tap Emergency SOS (`SOS.tsx` + `useGeoLocation` high-accuracy watch), evidence-rich reporting (`ReportForm.tsx` with `LandmarkPicker` + `compressImage` + voice/video), live shelter/safe-route GIS, missing registry, SDRF damage claims (1–5 images averaged), safety check-ins, and alerts.
2. **AapdaMitra AI Lifeline:** `PfaChat.tsx` + global `ChatWidget.tsx` — 24/7 PFA with 4-4-4 Box Breathing, trauma grounding, scope-limited to disaster/website topics (blocks `reverse string`/`py code`), OpenRouter 7-model fallback → `mocks.aiPfaChat` with trapped/collapse priority.
3. **Command Center:** 11 views under `AdminLayout` (`/admin`) — Live SOS siren (`LiveSOS.tsx` 880/440Hz), incident queue (`Reports.tsx`), GIS map, shelters, damage approvals, volunteers, agencies, broadcast (`Communications.tsx`), analytics (`Analytics.tsx`), audit logs, settings.
4. **Volunteer Portal:** `VolunteerLayout` (`/volunteer`) — Dashboard, AssignedTasks (strict `assignedVolunteerId` filter, no auto-impersonation), CheckIn with GPS.
5. **AI Engine:** `src/api/ai.ts` + `apps/ai-engine/app/*.py` — triage scoring, flood GeoJSON, ResNet-50 damage grading (now ensemble avg).
6. **Real Infrastructure:** `LeafletMap.tsx` + `lib/routing.ts` (`fetchOsrmRoute` via `router.project-osrm.org` with `foot`/`driving`, India bounds `[6,68]-[37.5,97.5]`), OSM/OpenTopoMap tiles, `ScaleControl`.

---

## 🏗️ Master System Architecture & Complete User Journey

### 1. Complete Website Workflow & User Journey (Actual Implementation)

```mermaid
flowchart TD
    classDef entry fill:#f8fafc,stroke:#0f172a,stroke-width:2px,color:#0f172a;
    classDef citizen fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a;
    classDef triage fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#78350f;
    classDef realtime fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#312e81;
    classDef volunteer fill:#f0fdf4,stroke:#10b981,stroke-width:2px,color:#064e3b;
    classDef admin fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#7f1d1d;
    classDef pfa fill:#faf5ff,stroke:#a855f7,stroke-width:2px,color:#581c87;
    classDef storage fill:#fff7ed,stroke:#f97316,stroke-width:1.5px,color:#7c2d12;

    A["🌐 Entry: HashRouter App.tsx<br/>MainLayout.tsx<br/>i18n 4-lang, theme, offline banner,<br/>bulletins listAlerts, bell 160+ alerts"]:::entry
    A --> B{"User Role / Intent?"}
    B -->|"Citizen (no login)"| C:::citizen
    B -->|"Volunteer"| V:::volunteer
    B -->|"Admin"| AD:::admin

    subgraph Citizen ["📱 CITIZEN — Zero-Auth (/) — src/pages/citizen/*"]
        C["Home.tsx<br/>Hero + Get Help wizard<br/>Quick Services carousel"]:::citizen
        C --> C1["🚨 Emergency SOS (/sos)<br/>SOS.tsx<br/>inputs: phone*, type, name, landmark<br/>hooks: useGeoLocation (watchPosition<br/>highAccuracy, isFallback, visibility pause)<br/>helpers: getHighPrecisionPosition,<br/>reverseGeocode, generateEmergencySms<br/>offline: localStorage aapdasetu_pending_sos<br/>early-return, no fake queued"]:::citizen
        C --> C2["📋 Report Incident (/report)<br/>ReportForm.tsx<br/>LandmarkPicker (MapContainer India maxBounds)<br/>Media: Upload 3 max 5MB + MediaRecorder<br/>voice 30s (audioStreamRef)<br/>GPS: isFallback hidden, locateHighAccuracy<br/>validation: type*, phone 10d, media ≥1 (photo/video/voice)*, description optional"]:::citizen
        C --> C3["🏕️ Shelters (/shelters)<br/>ShelterFinder.tsx<br/>useRealtime(listShelters,5000)<br/>Haversine sort, facilities filter<br/>260+280 BBSR dummy shelters<br/>markers stable id, no || fallback"]:::citizen
        C --> C4["🧭 Safe Routes (/safe-routes)<br/>SafeRoutes.tsx<br/>aiSatelliteFloodMap(center,radius30)<br/>lib/routing.ts fetchOsrmRoute (OSRM foot/driving)<br/>Polygon MultiPolygon handling,<br/>LeafletMap IndiaBounds OSM/Topo"]:::citizen
        C --> C5["👥 Missing (/missing-persons)<br/>photo* age* gender* lastSeen* phone*<br/>compressImage, maskPhone"]:::citizen
        C --> C6["🛡️ Safety Check-in<br/>SafetyCheckin.tsx<br/>fullName* phone* locationName*<br/>maskPhone, slice 100/200/500"]:::citizen
        C --> C7["🏚️ Damage Claim (/report-damage)<br/>1-5 images, per-image aiDamageAssessment<br/>avgScore/avgComp/avgGrade<br/>createDamageAssessment → realtime"]:::citizen
        C --> C8["🔍 Track (/track)<br/>ReportTracker.tsx<br/>getReport(trackingId)<br/>useRealtime poll 5s, abortRef<br/>OSRM driving route responder→incident<br/>no Math.random, hasCoords !=null"]:::citizen
        C --> C9["🤖 PFA Chat (/pfa-chat + ChatWidget)<br/>aiPfaChat → callOpenRouter 7 models<br/>(Nemotron/Gemma/GPT-OSS) 10s abort<br/>scopeLimit blocks reverse/py code<br/>mocks.aiPfaChat trapped/collapse priority<br/>cleanAiOutput, breathing coach"]:::pfa
        C --> C0["📢 Alerts / Contacts / About<br/>Alerts.tsx useRealtime 8s<br/>About story 3AM call"]:::citizen
    end

    subgraph Triage ["🧠 AI & Logic — src/api/ai.ts, lib/triage.ts"]
        C1 & C2 --> T1["computeTriage / aiTriage<br/>POST /ai/triage<br/>W_type (Earthquake +25 etc)<br/>W_nlp multi-lang trapped/drown/bleed<br/>W_demo child/senior/pregnant<br/>→ score 1-100 → RED/YELLOW/GREEN"]:::triage
        C7 --> T2["aiDamageAssessment per image<br/>POST /ai/damage-assessment<br/>Grade DESTROYED/MAJOR/MINOR<br/>Score, confidence, compensation<br/>→ avg across 5 images"]:::triage
        C4 --> T3["aiSatelliteFloodMap<br/>POST /ai/satelliteflood-map<br/>center+radius vs district<br/>GeoJSON Polygon/MultiPolygon"]:::triage
        C9 --> T4["callOpenRouter<br/>system: AAPDAMITRA_PROMPT<br/>history -6 cleanAiOutput<br/>for model in 7 with 10s abort<br/>isReasoningContaminated check<br/>→ fallback mocks.aiPfaChat"]:::pfa
    end

    subgraph Store ["💾 Client Store & Transport"]
        T1 & T2 & T3 & T4 --> S1["api/client.ts<br/>fetchWithTimeout 6s + 3 retries backoff<br/>withMockFallback: only 5xx/TypeError/Abort<br/>auth: admin header only /admin<br/>config trailing slash strip"]:::storage
        S1 --> S2["mocks.ts v6<br/>1500 reports, 270 shelters (10 BBSR safes),<br/>520 volunteers, 160 alerts<br/>localStorage keys:<br/>aapdasetu_mock_*_v6,<br/>aapdasetu_tracked_reports,<br/>aapdasetu_last_coords"]:::storage
        S1 --> S3["realtimeEventBus.ts<br/>emitRealtimeUpdate / subscribeRealtimeUpdates<br/>BroadcastChannel + visibility"]:::realtime
        S1 --> S4["useRealtime.ts<br/>poll intervalMs (5s) + bus<br/>hidden pause, abort race"]:::realtime
    end

    subgraph AdminFlow ["🚨 ADMIN — /admin — AdminLayout guard useIsAdminAuthed (storage event)"]
        S3 & S4 --> AD1["Overview.tsx KPIs<br/>Live SOS siren Web Audio 880/440Hz<br/>useRealtime"]:::admin
        AD1 --> AD2["Reports.tsx<br/>listReports (type/priority/status/q)<br/>client pagination 20, haversine falsy fix<br/>rankedVolunteers skill+distance"]:::admin
        AD2 --> AD3["Shelters.tsx / Volunteers.tsx<br/>create/update with isFallback guard<br/>closed→open fix"]:::admin
        S3 --> AD4["Communications.tsx broadcast<br/>SMS/WhatsApp/Web, audit_logs"]:::admin
        T2 --> AD5["DamageAssessment.tsx<br/>avg scores table, centroid fix,<br/>pagination 620 rows"]:::admin
        AD1 --> AD6["Analytics.tsx<br/>XAxis dataKey date fix<br/>hardcoded 14.2m"]:::admin
    end

    subgraph VolunteerFlow ["🧑‍🚒 VOLUNTEER — /volunteer — VolunteerLayout"]
        S3 --> V1["Dashboard.tsx<br/>NO auto vols[0], empty if no session<br/>login prompt"]:::volunteer
        V1 --> V2["AssignedTasks.tsx<br/>strict assignedVolunteerId === id<br/>empty if no session (no disclosure)<br/>updateReport status"]:::volunteer
        V1 --> V3["CheckIn.tsx<br/>no vols[0] fallback<br/>catch null"]:::volunteer
    end

    V2 -->|"status resolved"| S3
    AD2 -->|"assignVolunteer(report, volunteer)"| V2
    C8 -.->|"poll getReport + OSRM route"| S3

    S2 -.->|"offline queue"| S1
```

### 2. Detailed Route Map (Actual Files)

| Path | File | Auth | Key Logic |
|------|------|------|-----------|
| `/` | `Home.tsx` | public | Hero, Get Help wizard removed, 5 service cards, carousel `scrollBy 280` |
| `/sos` | `SOS.tsx` | public | `useGeoLocation` `isFallback` → `generateEmergencySms` without coords if fallback, `navigator.onLine` early-return queued, `aiTriage` after, `copyTrackingId` |
| `/report` | `ReportForm.tsx` | public | `LandmarkPicker` India bounds, `fileToDataUrl` 5MB, `MediaRecorder` + `audioStreamRef`, `report.gpsTitle*`, media (photo/video OR voice note) required, `report.descLabel` optional, `reverseGeocode` |
| `/track?id=SOS-xxx` | `ReportTracker.tsx` | public | `getReport` + `abortRef`, `hasCoords != null`, `fetchOsrmRoute(responder→incident, driving)` dashed false, `timeAgo` |
| `/shelters` | `ShelterFinder.tsx` | public | `useRealtime(listShelters,5000)` `Haversine` sort, `typeof lat==='number'` filter, `shel-fallback-${i}` |
| `/safe-routes` | `SafeRoutes.tsx` | public | `aiSatelliteFloodMap({center,radiusKm:30})` vs district, `polygonPaths` MultiPolygon flatMap, `fetchOsrmRoute` foot/driving, `LeafletMap` India `minZoom5 maxBounds` |
| `/missing-persons` | `MissingPersons.tsx` | public | `listMissingPersons` cancelled flag, `photo* age*` required, `startsWith https/data:image` check, `compressImage` |
| `/report-damage` | `ReportDamage.tsx` | public | 1–5 images `onFiles` + `removePhoto`, `perImageVerdicts` avg, `createDamageAssessment` realtime |
| `/pfa-chat` + widget | `PfaChat.tsx` `ChatWidget.tsx` | public | `aiPfaChat` scope `unrelatedPattern` vs `scopePattern` block, 7 models 10s abort, `cleanAiOutput` strip `* # emoji <think>` |
| `/admin/*` | `pages/admin/*` | `useIsAdminAuthed` `localStorage` + `storage` event | 11 views, `listReports` pagination, `haversineKm` falsy fix, `XAxis dataKey="date"` |
| `/volunteer/*` | `pages/volunteer/*` | `useIsVolunteerAuthed` | No `vols[0]` auto-login, empty if no session, `useRealtime` missing (known) |
| `*` | `App.tsx` `HashRouter` | — | Lazy `Suspense RouteFallback` + `ErrorBoundary` only MainLayout, `vercel.json` rewrite `/(.*)→/index.html` |

### 3. Global Multi-Tier System Architecture

```mermaid
graph TB
    subgraph ClientLayer["🌐 CLIENT INTERFACES"]
        Citizen["📱 Citizen Portal (Zero-Auth)<br/>SOS, Report(India bounds), Shelters(270), Routes(OSRM)"]
        AIWidget["🤖 AapdaMitra Widget<br/>Bottom 20 right-4 (mobile left vs right fix)<br/>Scope-limited"]
        Admin["🚨 Command Center<br/>/admin Live SOS siren, 1500 reports"]
        Volunteer["🧑‍🚒 Volunteer Portal<br/>No auto-impersonation"]
        MeshApp["📡 BitChat Android<br/>BLE/Wi-Fi Aware"]
    end
    subgraph CoreEngineLayer["⚡ CORE LOGIC & EVENT BUS"]
        PWAEngine["PWA sw.js CacheFirst/NetworkFirst<br/>IndexedDB aapdasetu_offline_queue<br/>visibility pause"]
        I18nEngine["i18n 4-lang EN/HI/BN/OR<br/>dictionaries in lib/i18n.tsx"]
        EventBus["RealtimeEventBus<br/>emitRealtimeUpdate / subscribe<br/>BroadcastChannel"]
        TSTriage["lib/triage.ts<br/>P_total = clamp(1,100,30+Wtype+Wnlp+Wdemo+Wgps)"]
        GISRouting["lib/routing.ts<br/>OSRM router.project-osrm.org<br/>foot/driving, haversineRouteLength"]
    end
    subgraph AIEngineLayer["🧠 PYTHON FASTAPI AI (8000→8080)"]
        PyTriage["triage.py /ai/triage"]
        VisionDamage["damage_service.py /ai/damage-assessment<br/>pHash X, ensemble avg 5 images"]
        SARMapper["satellite_flood_mapping.py /ai/satelliteflood-map<br/>Sentinel-1 SAR Otsu → GeoJSON"]
        PFABot["pfa_chatbot.py /ai/pfa-chat<br/>OpenRouter 7 models fallback"]
    end
    subgraph PersistenceLayer["🗄️ STORAGE"]
        DB[(PostgreSQL 16 Prisma 6<br/>Incident, Shelter, Volunteer, Agency<br/>DamageClaim, MissingPerson, Alert, AuditLog)]
        LocalStore[(Browser localStorage<br/>aapdasetu_mock_*_v6, tracked_reports,<br/>pending_sos, volunteer_session)]
    end
    Citizen --> PWAEngine
    Citizen --> I18nEngine
    Citizen --> TSTriage
    Citizen --> GISRouting
    AIWidget --> PFABot
    Admin --> EventBus
    Volunteer --> EventBus
    TSTriage --> EventBus
    EventBus --> Admin
    EventBus --> Volunteer
    VisionDamage --> Admin
    SARMapper --> GISRouting
    EventBus <--> DB
    EventBus <--> LocalStore
```

### 4. End-to-End Emergency SOS & Dispatch (Sequence — Real Code)

```mermaid
sequenceDiagram
    autonumber
    actor Victim as 🆘 Citizen
    participant App as 📱 SOS.tsx
    participant Geo as 🛰️ useGeoLocation<br/>watchPosition highAccuracy
    participant Loc as 📍 helpers<br/>reverseGeocode / getHighPrecision
    participant Triage as 🧠 aiTriage<br/>POST /ai/triage
    participant Client as 🌐 api/client<br/>fetchWithTimeout 6s retry3
    participant Bus as ⚡ realtimeEventBus
    actor Admin as 🚨 Admin LiveSOS
    actor Vol as 🧑‍🚒 Volunteer

    Victim->>App: click Emergency SOS (phone* + type)
    App->>Geo: coords, isFallback, source
    alt isFallback
        App->>App: toast "Location unavailable → Correct Area modal"
        App-->>Victim: show LandmarkPicker India maxBounds
    else gps granted
        Geo-->>App: {lat:20.27,lng:85.83,accuracy:5}
    end
    App->>Loc: reverseGeocode → address
    alt offline !navigator.onLine
        App->>App: localStorage aapdasetu_pending_sos, toast queued, return (no aiTriage/createReport)
    else online
        App->>Triage: aiTriage(input) → {score,label}
        App->>Client: createReport(input) → {trackingId SOS-xxxx, priorityLabel}
        Note over Client: withMockFallback only 5xx/TypeError/Abort mocks, 4xx throws
        Client->>Bus: emitRealtimeUpdate report_created
        Bus-->>Admin: LiveSOS audible 880/440Hz siren if RED
        Bus-->>Victim: Confirmation + Tracking ID + Copy ID button
        Admin->>Bus: assignVolunteer(report, nearest skill+distance haversine)
        Bus-->>Vol: AssignedTasks (strict filter)
        Vol->>Client: updateReport resolved
        Bus-->>Victim: /track live poll 5s + OSRM route responder→incident
    end
```

### 5. AI Triage, Routing & Damage Pipelines

- **Triage:** `lib/triage.ts` `computeTriage` — base 30 + W_type (Earthquake +25, Fire +20, Flood/Medical +18, Missing +15, Accident +12, Other +5) + W_nlp (trapped/drown +30, bleed/cardiac +25 etc capped 40) + W_demo (child ≤12 +25, senior ≥60 +20, pregnancy +30) + GPS bonus 5 → clamp 1-100 → RED≥80 YELLOW≥50 else GREEN.
- **Routing:** `lib/routing.ts` `fetchOsrmRoute(from,to,waypoints, foot|driving)` → `https://router.project-osrm.org/route/v1/${profile}/${lng,lat;...}?overview=full&geometries=geojson` 8s abort → points + distanceKm + durationMin. SafeRoutes uses driving for fastest, foot with flood waypoints (0.003° offset vertex) → average.
- **Damage:** Citizen 1–5 images `compressImage 800 0.75` → `Promise.all(aiDamageAssessment per image)` → avgScore/avgComp/avgConf/grade majority → `createDamageAssessment` → `damageStore` + `emitRealtimeUpdate damage_assessed` → Admin `/admin/damage-assessment` realtime.

---

## 📱 Comprehensive Citizen (User) Features

The citizen portal is completely **zero-authentication**—no sign-up, email, or password required.

| Feature & Route | Detailed Description & Capabilities | User Inputs & Automations | System Output & Value |
| :--- | :--- | :--- | :--- |
| **1-Tap Emergency SOS**<br>`#/sos` | One-touch instant distress trigger designed for extreme emergencies. Auto-detects GPS coordinates, calculates urgency, alerts the control room, and provides offline SMS fallback. | Auto-acquired GPS coordinates, accuracy radius (meters), physical landmark input. | Instant Tracking ID, live response link, emergency hotline fast-dial (112, 108, 1070). |
| **Intelligent Incident Report**<br>`#/report` | Multi-step structured emergency reporting for complex incidents. Supports 7 emergency categories, interactive landmark picker, mandatory media evidence (photo/video or voice note), and demographic vulnerability flags. | Emergency type, GPS picker, reporter phone, live audio voice recording, live video recording, victim count, special conditions. | AI triage priority calculation (visible on `/track`), tracking ID generation with one-tap copy. |
| **Live Incident Tracker**<br>`#/track` | Real-time tracking portal allowing victims and families to track the exact progress of their rescue in real time. | Incident Tracking ID (e.g. `SOS-7K2X9`). | Live milestone status (`Distress Registered` $\rightarrow$ `Dispatched` $\rightarrow$ `Resolved`), responder card, live ETA, GPS map telemetry. |
| **Nearby Shelter Finder**<br>`#/shelters` | Live relief camp locator sorted in real time by geodesic distance using the Haversine formula. Shows open bed availability and amenities. | GPS location, search query, facility filters (Medical Station, Food, Clean Water, Power Generator). | Distance in km, capacity/occupancy meter, status (Open/Full/Closed), one-tap phone call, turn-by-turn directions. |
| **Safe Evacuation Corridors**<br>`#/safe-routes` | Dynamic GIS navigation engine that computes safe walking evacuation corridors by detecting and avoiding Sentinel-1 SAR flood polygons and blocked infrastructure. | Starting GPS location, destination relief camp. | Comparison of direct route vs. AI safe detour, flood hazard boundary visualization, turn-by-turn walking steps. |
| **Missing Persons Registry**<br>`#/missing-persons` | Public search database and registration portal to help families find separated loved ones during chaotic evacuations. | Missing person name, approximate age, gender, last seen location, clothing description, photo upload. | Searchable public bulletin, match status (`Open`, `Matched`, `Resolved`), direct guardian contact trigger. |
| **Community Safety Check-in**<br>`#/check-in` | "I Am Safe" registry allowing citizens in disaster zones to mark themselves and family safe, reducing search team overhead. | Full name, phone number, district/sector, status (`Safe` / `Need Assistance`), personal message. | Public searchable safety board for relatives and relief agencies. |
| **SDRF Property Damage Claim**<br>`#/report-damage` | Crowdsourced structural damage assessment portal. Citizens upload photos of destroyed property to receive automated AI damage grading and SDRF compensation estimates. | Property owner name, contact number, address, infrastructure category, damaged property photo. | Perceptual hash deduplication check, AI damage severity grade (Grade 1/2/3), estimated SDRF relief grant (up to ₹1,20,000), claim ID. |
| **Public Warning Alerts**<br>`#/alerts` | Direct bulletin feed broadcasting official alerts from NDMA, SDMA, and District Disaster Management Authorities. | Category filters (`Critical`, `Warning`, `Advisories`). | Real-time warning banners, affected region badges, timestamped safety directives. |
| **AapdaMitra AI Crisis Lifeline**<br>`#/pfa-chat` & `ChatWidget` | 24/7 Psychological First Aid and survival assistant with 4-4-4 Box Breathing, 5-4-3-2-1 Sensory Grounding, and 1-tap callback dispatch. Available as a dedicated page and a glowing circular floating button. | Text or voice queries, quick disaster prompts. | Clean multi-lingual guidance without reasoning tokens, emergency callback trigger, hotline fast dial. |

---

## 🚨 Comprehensive Command Center (Admin) Features

The Command Center (`#/admin`) provides multi-agency incident command capabilities across 11 specialized views:

```
Command Center (/admin)
├── 📊 Overview & Real-Time KPIs
├── 🚨 Live SOS Emergency Stream (Audible Siren)
├── 📋 Incident Management & Dispatch Queue
├── 🗺️ Interactive GIS Command Map
├── 🏠 Shelter & Resource Inventory Management
├── 🏗️ SDRF Property Damage Assessment Review
├── 🔍 Missing Persons Moderation & Matching
├── 🧑‍🚒 Volunteer Fleet & Skill Tracking
├── 🏢 Multi-Agency Inter-Departmental Coordination
├── 📢 Emergency Multi-Channel Broadcaster (SMS/WhatsApp/Web)
├── 📈 Incident Analytics & Recharts Telemetry
├── 📜 Tamper-Evident Audit Trails & Security Logs
└── ⚙️ System Settings & API Gateway Integrations
```

### Admin Subsystem Capabilities:
1. **Live SOS Stream (`#/admin/live-sos`)**: Continuous WebSocket feed that triggers a synthesized dual-frequency (880Hz / 440Hz) audible siren whenever a `RED` (Score $\ge 80$) critical incident is registered.
2. **Incident Dispatch Queue (`#/admin/reports`)**: Filterable, sortable incident registry with status transitions (`pending` $\rightarrow$ `in_progress` $\rightarrow$ `resolved`), volunteer assignment modal with distance ranking, and CSV export.
3. **Interactive GIS Command Map**: Displays real-time incident clusters, volunteer locations, shelter occupancy, and Sentinel-1 SAR flood inundation polygons.
4. **Shelter & Resource Manager (`#/admin/shelters`)**: Real-time capacity adjustment, inventory tracking (food, clean water, medical supplies, fuel), and facility status toggles.
5. **Damage Assessment Approvals (`#/admin/damage-assessment`)**: AI-assisted claim review with anti-fraud duplicate detection metrics and SDRF compensation approval workflows.
6. **Volunteer Fleet Coordination (`#/admin/volunteers`)**: Responder skill matrix (`medical`, `search_rescue`, `driving`, `logistics`), GPS coordinates, and on-duty availability toggles.
7. **Multi-Agency Inter-Departmental Coordination (`#/admin/agencies`)**: Multi-agency dispatch management across NDRF, SDRF, Fire Department, Police, Hospitals, and NGOs.
8. **Emergency Communications Broadcaster (`#/admin/communications`)**: Geo-targeted emergency alerts distributed simultaneously across Web Push, Twilio SMS, and WhatsApp Cloud API.
9. **Analytics & Recharts Telemetry (`#/admin/analytics`)**: Interactive data visualizations showing emergency trends, priority distribution, resolution times, and regional heatmaps.
10. **Audit Logs & Security Trails (`#/admin/audit-logs`)**: Immutable timestamped action logs recording every administrative action, volunteer dispatch, and priority adjustment.

---

## 🧑‍🚒 Comprehensive Field Responder (Volunteer) Features

The Volunteer Portal (`#/volunteer`) provides field personnel with mobile-optimized tools:

| Feature & Route | Detailed Description & Capabilities |
| :--- | :--- |
| **Field Responder Dashboard**<br>`#/volunteer` | Real-time personal dashboard showing current duty status (`Available`, `On Duty`, `Offline`), active assigned emergency tasks, and quick response actions. |
| **Assigned Tasks & Navigation**<br>`#/volunteer/tasks` | Detailed task queue with victim contact details, GPS coordinates, triage urgency factor breakdown, embedded turn-by-turn map navigation, and milestone updates (`En Route` $\rightarrow$ `On Scene` $\rightarrow$ `Resolved`). |
| **Field Check-In & Geofencing**<br>`#/volunteer/checkin` | GPS-verified check-in enabling the control room to confirm responder safety, on-scene arrival, and shelter roster management. |
| **Volunteer Authentication**<br>`#/volunteer/login` | Secure credential verification for authorized emergency volunteers and relief workers. |

---

## 🧠 AI Microservice Engine & Algorithms

### 1. Multi-Factor Urgency Triage Algorithm (`triage.py` & `lib/triage.ts`)
$$P_{\text{total}} = \text{clamp}\left( 1, 100, S_{\text{base}} + W_{\text{type}} + \sum W_{\text{nlp}} + W_{\text{demo}} + W_{\text{gps}} \right)$$

- $S_{\text{base}} = 30$ (Base score)
- $W_{\text{type}}$: Earthquake ($+25$), Fire ($+20$), Flood ($+18$), Medical ($+18$), Missing ($+15$), Accident ($+12$), Other ($+5$).
- $\sum W_{\text{nlp}}$: Multi-lingual keyword weights (Drowning/Trapped = $+30$, Bleeding/Cardiac = $+25$, Rising Water/Unconscious = $+20$, Elderly/Diabetic = $+15$).
- $W_{\text{demo}}$: Infant/Child $\le 12$ ($+20$ to $+25$), Senior Citizen $\ge 60$ ($+20$), Pregnancy/Chronic ($+20$ to $+30$).
- $W_{\text{gps}}$: GPS accuracy verification bonus ($+5$).

### 2. Haversine Great-Circle Geodesic Distance Formula
$$d = 2R \cdot \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)} \right)$$
*(Where $R = 6371.0\text{ km}$, used for sorting nearest shelters and responders in milliseconds).*

### 3. Perceptual Hash (pHash) Anti-Fraud Duplicate Verification
$$D_H(H_1, H_2) = \sum_{i=1}^{64} (H_{1,i} \oplus H_{2,i}) < 5$$
*(Flags stolen or duplicate photos across damage claims submitted across districts).*

### 4. Sentinel-1 SAR Radar Satellite Flood Mapping (`satellite_flood_mapping.py`)
- Processes Sentinel-1 Synthetic Aperture Radar (SAR) imagery.
- Applies Otsu adaptive thresholding to detect water-covered surfaces and converts binary raster masks into GeoJSON MultiPolygon layers for Leaflet map pathfinding avoidance.

---

## 📡 Offline PWA & Decentralized BLE Mesh

1. **Progressive Web App (PWA) Engine:**
   - **Service Worker (`public/sw.js`):** Implements **Cache First** for assets/tiles and **Network First with Cache Fallback** for API data.
   - **IndexedDB Outbox Queue (`aapdasetu_offline_queue`):** Queues incident reports and SOS distress signals during complete cellular dropouts, automatically syncing them when connectivity returns.

2. **BitChat Android BLE Mesh (`bitchat-android`):**
   - Peer-to-peer mesh networking utilizing Bluetooth Low Energy (BLE) and Wi-Fi Aware.
   - Relays 256-byte encrypted emergency packets hop-by-hop across mobile nodes until an internet-connected gateway relays the signal to the AapdaSetu Command Center.

---

## 🗄️ Database Architecture & Data Models

Managed via **Prisma 6** with PostgreSQL 16:

```mermaid
erDiagram
    Incident ||--o| Volunteer : "assigned_volunteer_id"
    Incident ||--o| Agency : "assigned_agency_id"
    Shelter ||--o{ Resource : "shelter_id"
    Shelter ||--o{ Facility : "shelter_id"
    Admin ||--o{ AuditLog : "admin_id"

    Incident {
        uuid id PK
        string tracking_id UK
        enum type "fire, flood, medical, missing_person, earthquake, accident, other"
        enum status "pending, in_progress, resolved"
        int priority_score "1..100"
        enum priority_label "RED, YELLOW, GREEN"
        float latitude
        float longitude
        string landmark
        string reporter_name
        string reporter_phone
        string description
        jsonb triage_factors
        string media_url
        boolean is_one_tap_sos
        datetime created_at
    }

    Volunteer {
        uuid id PK
        string name
        string phone
        string email
        enum_array skills "medical, search_rescue, driving, logistics"
        float latitude
        float longitude
        enum status "available, on_duty, offline"
        datetime last_checkin
    }

    Shelter {
        uuid id PK
        string name
        string address
        string district
        float latitude
        float longitude
        int capacity
        int occupancy
        enum status "open, full, closed"
        string contact_phone
    }

    Facility {
        uuid id PK
        uuid shelter_id FK
        enum type "food, water, medical_station, power_generator"
        boolean available
    }

    Resource {
        uuid id PK
        uuid shelter_id FK
        string name
        enum category "food, water, medical, clothing, fuel"
        int quantity
        string unit
    }

    Agency {
        uuid id PK
        string name
        enum type "fire_department, police, ndrf, sdrf, hospital, ngo"
        string contact_phone
        int active_personnel
    }

    DamageClaim {
        uuid id PK
        string claim_id UK
        string owner_name
        string owner_phone
        string property_address
        string district
        enum classification "MINOR_DAMAGE, MODERATE_DAMAGE, SEVERE_COLLAPSE, TOTAL_DESTRUCTION"
        float estimated_compensation
        string photo_url
        string phash
        datetime created_at
    }

    SafetyCheckin {
        uuid id PK
        string full_name
        string phone
        string district
        enum status "safe, need_assistance"
        string message
        datetime created_at
    }

    MissingPerson {
        uuid id PK
        string full_name
        int age
        string gender
        string last_seen_location
        string clothes_description
        string contact_phone
        string photo_url
        enum status "open, matched, resolved"
        datetime created_at
    }

    Alert {
        uuid id PK
        string title
        string message
        enum severity "info, warning, critical"
        enum channel "sms, whatsapp, public, all"
        string affected_region
        datetime created_at
    }

    AuditLog {
        uuid id PK
        string admin_email
        string action
        string entity_type
        string entity_id
        jsonb metadata
        datetime created_at
    }
```

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite 6 | High-speed client SPA with rapid hot module replacement |
| **Styling & UI Tokens** | Tailwind CSS 3.4, Lucide React | Glassmorphism, dark/light theme, accessible micro-interactions |
| **GIS & Maps** | Leaflet.js 1.9, React-Leaflet | Real-time map rendering, marker clustering, hazard avoidance polygons |
| **Data Visualizations** | Recharts 3 | Responsive interactive charts for command center analytics |
| **Realtime Engine** | Realtime Event Bus, WebSockets | Instant pub-sub synchronization across citizens, admins, and responders |
| **Backend & ORM** | Node.js, Express, TypeScript, Prisma 6 | Enterprise REST API endpoints with PostgreSQL persistence |
| **Database** | PostgreSQL 16 | Relational data persistence with UUID primary keys and compound indexes |
| **AI Microservices** | Python 3.10+, FastAPI, PyTorch, OpenCV, OpenRouter | Explainable Triage, PFA Chatbot, SAR Flood Mapping & Image Damage Classifier |
| **PWA & Offline** | Web App Manifest, Service Worker (`sw.js`), IndexedDB | Offline asset caching and queued incident submission |
| **SOA Mesh App** | Kotlin, Jetpack Compose, BLE, Wi-Fi Aware | Offline peer-to-peer mesh messaging for zero-network environments |

---

## 📁 Repository Directory Structure

```
SIH-DM/
├── frontend-aapdasetu/                 # Primary React 19 + TypeScript + Vite Web Application
│   ├── public/                         # Web manifest, icons, and Service Worker (sw.js)
│   ├── src/
│   │   ├── api/                        # API clients, OpenRouter AI adapters, and mock data
│   │   ├── components/                 # Reusable UI components (AapdaSetuLogo, ChatWidget, Modal, Map)
│   │   ├── layouts/                    # MainLayout, AdminLayout, VolunteerLayout
│   │   ├── lib/                        # Helpers, i18n dictionary (EN/HI/BN/OR), triage engine, event bus
│   │   ├── pages/
│   │   │   ├── admin/                  # 11 Command Center views (LiveSOS, Shelters, Reports, etc.)
│   │   │   ├── citizen/                # Citizen views (SOS, Home, Report, SafeRoutes, PfaChat, etc.)
│   │   │   └── volunteer/              # Volunteer views (Dashboard, AssignedTasks, CheckIn)
│   │   ├── types.ts                    # Central TypeScript interfaces and data models
│   │   ├── App.tsx                     # Route switchboard
│   │   └── main.tsx                    # Vite entry point
│   ├── package.json
│   └── vite.config.ts
│
├── backend-aapdasetu/                  # Node.js + Express + Prisma 6 PostgreSQL Backend
│   ├── prisma/                         # Prisma schema (schema.prisma) and seed data
│   ├── src/                            # Controllers, services, routes, middleware, and realtime hub
│   ├── fastapi-service/                # Integrated Python FastAPI service for damage and triage ML
│   └── package.json
│
├── apps/
│   └── ai-engine/                      # Standalone Python AI Microservice Engine
│       └── app/
│           ├── main.py                 # FastAPI microservice router
│           ├── triage.py               # Explainable SOS urgency scoring engine
│           ├── damage_assessment.py    # Photo anti-fraud & structural damage grading
│           ├── pfa_chatbot.py          # Psychological First Aid bot engine
│           └── satellite_flood_mapping.py # SAR Sentinel-1 satellite radar flood mapper
│
├── bitchat-android/                    # Offline BLE / Wi-Fi Aware Android Mesh App
│   ├── app/                            # Kotlin, Jetpack Compose, BLE mesh network protocol
│   ├── wear/                           # Wear OS companion app
│   └── README.md                       # Comprehensive SOA Mesh documentation
│
├── README.md                           # Master system documentation
├── flow.md                             # 12 detailed operational workflows & sequence diagrams
├── tech.md                             # Technical architecture, algorithms, and data contracts
├── projectrequirement.md               # Scope and master feature matrix
└── LICENSE                             # MIT License
```

---

## 🚦 Getting Started & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: v3.10 or higher
- **PostgreSQL**: v15.0 or higher *(Optional for local database mode)*

### 1. Web Application (`frontend-aapdasetu`)
```bash
cd frontend-aapdasetu
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```
- **Citizen Portal**: `http://localhost:5173/`
- **1-Tap SOS**: `http://localhost:5173/#/sos`
- **Command Center**: `http://localhost:5173/#/admin`
- **Volunteer Portal**: `http://localhost:5173/#/volunteer`

### 2. Backend API Service (`backend-aapdasetu`)
```bash
cd backend-aapdasetu
npm install
npx prisma generate
npm run dev      # Starts Express backend on http://localhost:3000
```

### 3. Standalone Python AI Microservice (`apps/ai-engine`)
```bash
cd apps/ai-engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/main.py   # Starts FastAPI microservices on http://localhost:8000
```

### 4. Offline Mesh Android App (`bitchat-android`)
```bash
cd bitchat-android
./gradlew assembleDebug   # Builds debug APK for offline BLE mesh testing
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 📜 License & Acknowledgments

- Developed under the **Smart India Hackathon (SIH) Disaster Management Initiative**.
- Engineered with humanitarian dedication to protecting lives, streamlining multi-agency rescue efforts, and accelerating disaster relief worldwide.
- Open-source under the [MIT License](LICENSE).
