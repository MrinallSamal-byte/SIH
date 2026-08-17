# 🛡️ AapdaSetu (आपदासेतु / આપદાસେતુ / ଆପଦାସେତୁ) — Disaster Response & AI Triage Ecosystem

> **A Comprehensive, Real-Time Humanitarian Relief, Emergency Response, and Multi-Agency Incident Command Platform.**  
> *Built with React 19, TypeScript, Vite, Tailwind CSS, Leaflet.js GIS, Realtime Event Bus, Prisma 6 PostgreSQL, FastAPI AI Microservices, and Offline BLE Mesh Support.*

[![Initiative](https://img.shields.io/badge/Initiative-SIH%20Disaster%20Management-orange.svg)](https://github.com/MrinallSamal-byte/SIH)
[![Web Architecture](https://img.shields.io/badge/Architecture-React%2019%20%2B%20TypeScript%20%2B%20FastAPI%20AI-blue.svg)](https://github.com/MrinallSamal-byte/SIH)
[![PWA Ready](https://img.shields.io/badge/PWA-Service%20Worker%20%2B%20Offline%20Ready-emerald.svg)](https://github.com/MrinallSamal-byte/SIH)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌐 Live Deployment & Repositories

- **Live Web Application:** [https://sih-ochre-xi.vercel.app/](https://sih-ochre-xi.vercel.app/)
- **GitHub Repository:** [https://github.com/MrinallSamal-byte/SIH](https://github.com/MrinallSamal-byte/SIH)

---

## 📌 Executive Summary

During catastrophic natural disasters (floods, cyclones, earthquakes, building collapses), traditional emergency hotlines and web portals fail due to telecommunication congestion, illiteracy barriers, lack of geo-spatial intelligence, and centralized server bottlenecks.

**AapdaSetu (आपदासेतु)** is a unified disaster management and humanitarian relief ecosystem designed specifically for high-density, resource-constrained, and low-infrastructure environments. It bridges the critical "last-mile" rescue gap by seamlessly integrating:

1. **Citizen Emergency Portal (`frontend-aapdasetu`)**: Zero-authentication, high-accessibility mobile-first web app supporting 1-Tap SOS, voice/video incident reporting, live incident tracking, safe evacuation pathfinding, nearby relief shelter discovery, missing persons registry, and SDRF property damage assessment.
2. **AapdaMitra AI Crisis Lifeline (`ChatWidget` & `/pfa-chat`)**: 24/7 AI-powered disaster survival companion and Psychological First Aid (PFA) assistant with stress-reducing box breathing exercises, anti-reasoning output filters, and automatic one-tap emergency callback dispatch.
3. **Multi-Agency Command Center (`/admin/*`)**: Real-time incident command dashboard featuring live audio alarms for critical RED alerts, interactive GIS Leaflet mapping, skill-matched volunteer auto-dispatch, shelter capacity tracking, SDRF relief claim review, and multi-channel broadcast messaging.
4. **Volunteer Responder Portal (`/volunteer/*`)**: Dedicated field responder interface for viewing assigned rescue tasks, accessing turn-by-turn navigation to incident sites, updating rescue status milestones, and managing shelter rosters.
5. **AI Microservice Engine (`apps/ai-engine` & `fastapi-service`)**: FastAPI microservices delivering explainable multi-factor SOS urgency scoring, SAR satellite radar flood mapping, and anti-fraud computer vision property damage classification.
6. **Decentralized Offline Mesh (`bitchat-android`)**: Zero-infrastructure BLE (Bluetooth Low Energy) and Wi-Fi Aware peer-to-peer mesh communication for off-grid student campuses and isolated disaster zones.

> [!IMPORTANT]
> **Zero User-Side Authentication Policy:** To guarantee zero-friction access during life-or-death emergencies, **no login or account creation is required** for citizens to trigger SOS alerts, track rescue progress, search missing family members, check in as safe, find relief camps, or receive survival guidance.

---

## 🏗️ System Architecture & Workflow Diagrams

### 1. High-Level Multi-Tier Ecosystem Architecture

```mermaid
graph TB
    subgraph ClientTier["🌐 Web Clients & Field Apps"]
        CitizenPortal["📱 Citizen Emergency Portal\n(1-Tap SOS, Report, Track, Shelters, Routes)"]
        AapdaMitraWidget["🤖 AapdaMitra AI Companion\n(PFA Chat, Voice, Callback Dispatch)"]
        AdminCommand["🚨 Command Center Dashboard\n(Live SOS Stream, GIS Map, Dispatch, Analytics)"]
        VolunteerApp["🧑‍🚒 Volunteer Responder Portal\n(Task Queue, Geolocation, Field Status)"]
        OfflineMesh["📡 BitChat Android SOA Mesh\n(Offline BLE / Wi-Fi Aware Mesh)"]
    end

    subgraph LogicTier["⚡ Core Application & Triage Layer"]
        PWA["PWA Service Worker\n(Offline Cache & Sync Queue)"]
        I18nEngine["Multi-Lingual Engine (i18n)\n(English, Hindi, Bengali, Odia)"]
        RealtimeBus["Realtime Event Bus & WebSockets\n(Live Alert Broadcast & Status Sync)"]
        TSTriage["TypeScript Triage Scorer\n(lib/triage.ts)"]
        GISPathfinder["GIS Hazard Avoidance Engine\n(Leaflet.js + GeoJSON)"]
    end

    subgraph AIEngineTier["🧠 Python FastAPI AI Microservice Engine"]
        TriageAI["Explainable SOS Urgency Triage\n(triage.py)"]
        VisionAI["Computer Vision Damage Assessment\n(pHash + Structural Grading)"]
        SARAI["Sentinel-1 SAR Satellite Radar Flood Mapper\n(satellite_flood_mapping.py)"]
        PFAAI["Psychological First Aid AI\n(pfa_chatbot.py)"]
    end

    subgraph DataTier["🗄️ PostgreSQL Database & Storage Tier"]
        DB[(PostgreSQL 16 Database\nPrisma 6 ORM)]
        PrismaModels["Incidents, Shelters, Volunteers, Agencies,\nDamageClaims, MissingPersons, Checkins, Alerts"]
    end

    CitizenPortal --> PWA
    CitizenPortal --> I18nEngine
    CitizenPortal --> TSTriage
    CitizenPortal --> GISPathfinder
    AapdaMitraWidget --> PFAAI
    AdminCommand --> RealtimeBus
    VolunteerApp --> RealtimeBus
    
    TSTriage --> RealtimeBus
    RealtimeBus --> AdminCommand
    RealtimeBus --> VolunteerApp
    
    VisionAI --> AdminCommand
    SARAI --> GISPathfinder
    
    RealtimeBus <--> DB
    AdminCommand <--> DB
    VolunteerApp <--> DB
```

---

### 2. End-to-End Emergency SOS & Rescue Dispatch Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Victim as 🆘 Trapped Citizen
    participant WebApp as 📱 Citizen Web App
    participant AI as 🧠 AI Triage Engine
    participant EventBus as ⚡ Realtime Event Bus
    actor Admin as 🚨 Command Center Operator
    actor Volunteer as 🧑‍🚒 Field Responder

    Victim->>WebApp: 1. Tap 1-Tap SOS / Submit Emergency Report
    WebApp->>WebApp: 2. Auto-acquire high-accuracy GPS & reverse geocode
    WebApp->>AI: 3. Evaluate multi-factor urgency payload
    AI-->>WebApp: 4. Returns score (e.g. 88, RED - CRITICAL, breakdown factors)
    WebApp->>EventBus: 5. Broadcast IncidentRegistered event with Tracking ID
    EventBus-->>Admin: 6. Real-time audio alarm + Live SOS stream highlight
    EventBus-->>Victim: 7. Instant Tracking ID issued (e.g. SOS-7K2X9)
    Admin->>EventBus: 8. Assign skill-matched nearest volunteer (e.g. Swimmer / Medical)
    EventBus-->>Volunteer: 9. Push dispatch notification with GPS coordinates & turn-by-turn route
    Volunteer->>WebApp: 10. Update status to 'On Scene' -> 'Evacuated'
    EventBus-->>Victim: 11. Live tracker reflects rescue progress in real time
```

---

### 3. Multi-Factor AI Urgency Triage Pipeline

```mermaid
flowchart TD
    Input["Input Payload: Emergency Type, Description, Demographics, Landmark, Voice/Video Transcripts"] --> BaseScore["Initialize Base Priority: 30 Points"]

    BaseScore --> TypeWeight{"Stage 1: Disaster Category Weight"}
    TypeWeight -->|Earthquake / Collapse| +25pts["+25 Points"]
    TypeWeight -->|Fire / Explosion| +20pts["+20 Points"]
    TypeWeight -->|Flood / Water Rising| +18pts["+18 Points"]
    TypeWeight -->|Critical Medical / Cardiac| +18pts["+18 Points"]
    TypeWeight -->|Missing Person Search| +15pts["+15 Points"]
    TypeWeight -->|Transit / Road Accident| +12pts["+12 Points"]
    TypeWeight -->|General / Other| +5pts["+5 Points"]

    +25pts & +20pts & +18pts & +15pts & +12pts & +5pts --> NLPMatrix{"Stage 2: Multi-Lingual NLP Keyword Matrix"}

    subgraph Keywords["Multi-Lingual Keyword Scanning (EN / HI / BN / OR)"]
        K1["drowning, trapped, submerged, roof collapsed, ଛାତ ଉପରେ, ଫସି ରହିଛି, डूब रहे हैं"] -->|+30 Pts Each| Acc[Accumulator]
        K2["severe bleeding, infant, newborn, cardiac, heart attack, പ്രസവം, ରକ୍ତସ୍ରାବ"] -->|+25 Pts Each| Acc
        K3["water rising fast, unconscious, child, snakebite, electrocution, ବିଦ୍ୟୁତ ଆଘାତ"] -->|+20 Pts Each| Acc
        K4["elderly, senior citizen, diabetic, asthma, no food/water, ବୟସ୍କ"] -->|+15 Pts Each| Acc
    end

    NLPMatrix --> Keywords
    Acc --> DemoCheck{"Stage 3: Demographic Multipliers"}

    DemoCheck -->|Infant / Child <= 12 yrs| +Age1["+20 to +25 Points"]
    DemoCheck -->|Senior Citizen >= 60 yrs| +Age2["+20 Points"]
    DemoCheck -->|Pregnancy / Chronic Illness| +Med["+20 to +30 Points"]

    +Age1 & +Age2 & +Med & DemoCheck --> Normalizer["Score Normalizer: Clamp between [1, 100]"]

    Normalizer --> BadgeClass{"Stage 4: Priority Badge Classification"}
    BadgeClass -->|Score >= 80| RED["🔴 RED / CRITICAL ALERT\n- Audible Siren in Command Center\n- Top Queue Priority for Boat & Helicopter Teams"]
    BadgeClass -->|50 <= Score < 80| YELLOW["🟡 YELLOW / URGENT\n- High Priority Dispatch Queue\n- Field Responder Assignment"]
    BadgeClass -->|Score < 50| GREEN["🟢 GREEN / ADVISORY\n- Standard Monitoring Queue\n- Scheduled Relief Distribution"]
```

---

### 4. Disaster-Aware Dynamic GIS Pathfinding & Hazard Avoidance

```mermaid
flowchart TD
    Start["Origin: User Live GPS Position"] --> Goal["Destination: Nearest Operational Shelter"]
    Goal --> FetchSAR["Fetch Active Hazard Polygons\n(Sentinel-1 SAR Satellite Flood Extents, Road Inundation)"]
    FetchSAR --> IntersectCheck{"Does Straight-Line Route Intersect Flood Polygon?"}
    
    IntersectCheck -- "Yes (Hazard Zone Detected)" --> DetourEngine["Execute AI Detour Geometry\n- Compute Safe Waypoints outside Inundation Zone\n- Avoid High-Water Underpasses"]
    IntersectCheck -- "No (Path Clear)" --> DirectRoute["Keep Direct Evacuation Corridor"]

    DetourEngine --> LeafletRender["Render Interactive Route on Leaflet.js Map\n- Red: Direct Hazard Path (Inundated)\n- Green: Safe Evacuation Corridor\n- Blue: Live GPS Tracker Marker"]
    DirectRoute --> LeafletRender
```

---

### 5. AI Property Damage Assessment & SDRF Relief Claim Workflow

```mermaid
flowchart LR
    Upload["Citizen Uploads Damaged Property Photo"] --> PHash["Perceptual Hash (pHash) Deduplication Check"]
    PHash --> DuplicateCheck{"Is Duplicate / Fraudulent Image?"}
    
    DuplicateCheck -- "Yes" --> FlagFraud["Flag Claim as Potential Duplicate & Alert Admin"]
    DuplicateCheck -- "No" --> VisionModel["AI Computer Vision Classification Model"]
    
    VisionModel --> Grading{"Damage Severity Classification"}
    Grading -->|Severe / Total Destruction| Grade1["Grade 1: Severe Structural Failure\nCompensation: ₹1,20,000"]
    Grading -->|Moderate / Partial Collapse| Grade2["Grade 2: Partial Wall / Roof Collapse\nCompensation: ₹65,000"]
    Grading -->|Minor / Superficial Damage| Grade3["Grade 3: Cosmetic / Minor Inundation\nCompensation: ₹25,000"]

    Grade1 & Grade2 & Grade3 --> ClaimDossier["Generate SDRF Relief Claim Dossier & Claim ID"]
    ClaimDossier --> AdminReview["Command Center SDRF Verification & DBT Approval"]
```

---

### 6. Psychological First Aid (AapdaMitra AI) Conversational Workflow

```mermaid
flowchart TD
    UserQuery["User Enters Query or Taps Quick Shortcut"] --> CrisisDetect{"Is Critical Panic / Crisis Detected?"}
    
    CrisisDetect -- "Hyperventilation / Panic" --> BreathingExercise["Trigger Box Breathing Protocol\n(4s Inhale - 4s Hold - 4s Exhale Animation)"]
    CrisisDetect -- "Severe Trauma / Dissociation" --> GroundingExercise["Trigger 5-4-3-2-1 Sensory Grounding Protocol"]
    CrisisDetect -- "Immediate Physical Danger" --> DangerBanner["Display Critical Emergency Action Card\n- 1-Tap 112 / 108 Call Buttons\n- Direct Callback Phone Request Input"]
    CrisisDetect -- "General Inquiry" --> PFAEngine["AI Crisis Model with Safety Grounding"]

    DangerBanner --> SubmitCallback["Victim Submits Phone Number"]
    SubmitCallback --> AutoSOS["Auto-Generate Priority SOS Dispatch in Command Queue"]
    
    BreathingExercise & GroundingExercise & PFAEngine --> CleanOutput["Filter Reasoning Tokens, Markdown Asterisks & Emojis"]
    CleanOutput --> DisplayResponse["Deliver Clean, Actionable Multi-Lingual Safety Guidance"]
```

---

### 7. Relational Database Schema (Prisma 6 PostgreSQL)

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

## 🌟 Feature Breakdown by Portal

### 1. Citizen Emergency Portal (Zero-Auth)
- **1-Tap Emergency SOS (`/sos`)**: Immediate one-click distress broadcasting capturing browser GPS coordinates with accuracy radius, landmark notes, and offline SMS fallback.
- **Incident Reporting (`/report`)**: Intuitive multi-step report submission with photo, audio voice-recording, and video upload capabilities.
- **Incident Tracking (`/track`)**: Real-time status tracker by tracking ID with milestone timeline progression (`Distress Registered` -> `Response Dispatched` -> `Evacuated & Resolved`).
- **Nearby Shelter Finder (`/shelters`)**: Haversine distance-sorted relief camps showing live bed availability, facility badges, and one-touch calling.
- **Safe Evacuation Corridors (`/safe-routes`)**: Interactive Leaflet maps rendering dynamic detour routes avoiding flooded zones and damaged infrastructure.
- **Missing Persons Registry (`/missing-persons`)**: Searchable public bulletin database with image matching and guardian contact triggers.
- **Community Safety Check-in (`/check-in`)**: Public "I Am Safe" registry reducing search team overhead.
- **SDRF Property Damage Claim (`/report-damage`)**: Automated damage claim filing with instant AI damage classification and relief grant estimation.
- **Public Warning Bulletins (`/alerts`)**: Live feeds from NDMA, SDMA, and District Incident Commands.
- **Circular Floating AapdaMitra AI Button (`ChatWidget`)**: Ergonomic floating circular robot button with ambient glow positioned safely above mobile navigation bars.

### 2. Command Center & Admin Dashboard (`/admin/*`)
- **Real-Time Overview (`/admin`)**: Metric KPI summary cards, incident priority charts, and rapid triage shortcuts.
- **Live SOS Triage Stream (`/admin/live-sos`)**: Continuous WebSocket feed with loud sound alarms for critical RED distress alerts.
- **Incident Dossiers & Dispatch (`/admin/reports`)**: Comprehensive incident management, volunteer assignment, and status updates.
- **Shelter & Resource Manager (`/admin/shelters`)**: Camp capacity adjustment, inventory tracking, and facility status toggles.
- **Damage Assessment Approvals (`/admin/damage-assessment`)**: AI-assisted claim review with fraud detection and compensation disbursement.
- **Volunteer Fleet Tracking (`/admin/volunteers`)**: Responder skill matrix, GPS location, and duty roster.
- **Agency Coordination (`/admin/agencies`)**: Multi-departmental task allocation across NDRF, SDRF, Fire, Police, and NGOs.
- **Emergency Broadcast Center (`/admin/communications`)**: Geo-targeted alerts distributed across Public Web, SMS, and WhatsApp.
- **Analytics & Trends (`/admin/analytics`)**: Interactive Recharts data visualizations showing emergency trends and resolution times.
- **Audit Trails (`/admin/audit-logs`)**: Tamper-evident activity logs recording every administrative action.

### 3. Volunteer Portal (`/volunteer/*`)
- **Field Responder Dashboard (`/volunteer/dashboard`)**: Current duty status switcher, active emergency task queue, and quick-dispatch actions.
- **Assigned Tasks & Turn-by-Turn GPS (`/volunteer/tasks`)**: Victim contact details, triage severity factors, and embedded mapping navigation.
- **Field Check-In (`/volunteer/checkin`)**: Geofenced GPS check-in to confirm responder safety and arrival on scene.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite 6 | High-speed SPA client with lightning-fast HMR |
| **Styling & Design System** | Tailwind CSS, Lucide React, Glassmorphism | Responsive dark/light theme, custom accessible design tokens |
| **GIS & Mapping** | Leaflet.js 1.9, React-Leaflet | Dynamic hazard polygons, marker clustering & route visualization |
| **State & Realtime** | Realtime Event Bus, WebSockets, Custom Hooks | Instant synchronization between citizen reports and command center |
| **Backend & ORM** | Node.js, Express, TypeScript, Prisma 6 | Robust REST API endpoints with PostgreSQL database |
| **Database** | PostgreSQL 16 | Relational data persistence with UUID primary keys and indexes |
| **AI Microservices** | Python 3.10+, FastAPI, PyTorch, OpenCV, OpenRouter | Urgency Triage, PFA Chatbot, SAR Flood Mapping & Image Damage Classification |
| **PWA & Offline** | Web App Manifest, Service Worker (`sw.js`), Cache API | Offline asset caching and queued incident submission |
| **SOA Mesh App** | Kotlin, Jetpack Compose, BLE, Wi-Fi Aware | Offline peer-to-peer mesh messaging for network-free disaster zones |

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
├── flow.md                             # System workflow and architecture documentation
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
- Built with humanitarian commitment to saving lives and coordinating rapid disaster relief worldwide.
- Open-source under the [MIT License](LICENSE).
