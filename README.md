# 🛡️ AapdaSetu (आपदासेतु / આપદાસેતુ) — Disaster Response & AI Triage Ecosystem

> **A Next-Generation Web Platform & AI Engine for Real-Time Humanitarian Relief, Emergency Response, and Multi-Agency Incident Command.**  
> *Built with React 19, Next.js 13, Vite, Tailwind CSS, Leaflet.js, Supabase Realtime WebSockets, and a Python FastAPI AI Microservice Engine.*

[![SIH Initiative](https://img.shields.io/badge/Initiative-SIH%20Disaster%20Management-orange.svg)](https://github.com/MrinallSamal-byte/SIH)
[![Web Architecture](https://img.shields.io/badge/Architecture-React%20%2B%20Next.js%20%2B%20Python%20AI-blue.svg)](https://github.com/MrinallSamal-byte/SIH)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Executive Summary

During major natural disasters (floods, cyclones, earthquakes), traditional response applications fail due to cellular network blackouts, control room overload, outdated navigation, and illiteracy barriers.

**AapdaSetu (आपदासेतु)** is a unified, web-based disaster management platform engineered for high-density, low-infrastructure environments. It bridges the critical "last-mile" rescue gap by combining:
1. **React Web Application (`frontend-AapdaSetu`)**: High-speed Vite client with Leaflet.js interactive maps, hazard route planning, and emergency forms.
2. **Next.js & Supabase Engine (`SOS-project with bolt`)**: Production-ready command center platform with 1-Tap SOS, 11 modular admin views, Supabase PostgreSQL RLS, and WebSockets real-time streaming.
3. **Python AI Microservice Engine (`apps/ai-engine`)**: FastAPI service providing automated emergency triage, SAR satellite flood mapping, anti-fraud damage assessment, and Psychological First Aid (PFA) chatbot grounding.

> [!IMPORTANT]
> **Zero User-Side Authentication Policy:** AapdaSetu is architected for zero-friction emergency accessibility during catastrophic disasters. There is **no user-side authentication or login required** for citizens or victims to trigger emergency SOS alerts, track incident status, view safe evacuation routes, receive early warnings, interact with the PFA AI chatbot, or submit safety check-ins. All emergency features are immediately accessible out-of-the-box.

---

## 🏗️ High-Level Architecture & System Flow Diagrams

### 1. Global End-to-End Multi-Stack System Architecture

```mermaid
graph LR
    subgraph ClientLayer["React & Next.js Web Clients"]
        CitizenUI["Citizen Public Portal\n(1-Tap SOS, Check-in, Shelter Finder)"]
        AdminUI["Command Center\n(11 Admin Subsystem Views)"]
        GISUI["Leaflet GIS Safe Navigation\n(/safe-routes)"]
    end

    subgraph LogicLayer["Logic & Triage Engines"]
        TSTriage["TypeScript Triage Engine\n(lib/triage.ts)"]
        Haversine["Haversine Distance Engine\n(lib/helpers.ts)"]
        I18n["Multi-Lingual Engine\n(EN / HI / OR)"]
    end

    subgraph AIEngine["Python AI Engine Hub (apps/ai-engine)"]
        PyTriage["AI Urgency Triage\n(triage.py)"]
        DamageModule["Damage Assessment\n(damage_assessment.py)"]
        PFAModule["PFA Chatbot Engine\n(pfa_chatbot.py)"]
        FloodModule["SAR Satellite Mapping\n(satellite_flood_mapping.py)"]
    end

    subgraph BackendLayer["Supabase PostgreSQL & Realtime Tier"]
        DB[("PostgreSQL Database\n(8 Primary Tables)")]
        Realtime["Supabase Realtime WebSockets\n(postgres_changes Listener)"]
        RPCAuth["RPC verify_admin_login()\n(Security Definer)"]
    end

    CitizenUI --> TSTriage
    CitizenUI --> Haversine
    CitizenUI --> PyTriage
    AdminUI --> RPCAuth
    TSTriage --> DB
    PyTriage --> DB
    DB <--> Realtime
    Realtime --> AdminUI
    FloodModule --> GISUI
```

---

### 2. Sequence Diagram: End-to-End Emergency SOS & Dispatch Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Victim as 🆘 Trapped Citizen
    participant Client as 📱 Citizen Web App (React / Next.js)
    participant Triage as 🧠 AI Triage Engine (TS / Python)
    participant Supabase as ⚡ Supabase Realtime DB
    actor Admin as 🚨 Control Room Command Center
    actor Rescuer as 🧑‍🚒 Field Volunteer / Responder

    Victim->>Client: 1. Click 1-Tap SOS / Submit Report Form
    Client->>Client: 2. Auto-fetch GPS Coordinates & Demographics
    Client->>Triage: 3. Compute Urgency Score (Base 30 + Weights + Demographics)
    Triage-->>Client: 4. Returns { score: 85, label: 'RED', factors: [...] }
    Client->>Supabase: 5. INSERT into 'reports' table
    Supabase-->>Admin: 6. Push Realtime WebSocket Event + Loud Audio Alarm
    Admin->>Admin: 7. Highlight Incident in Live SOS Stream & Open Triage Modal
    Admin->>Supabase: 8. Assign Field Volunteer & Update Status to 'in_progress'
    Supabase-->>Rescuer: 9. Dispatch Task to Nearest Skill-Matched Responder
    Rescuer->>Admin: 10. Confirm Rescue Complete -> Status updated to 'resolved'
```

---

### 3. AI Urgency Triage & Priority Scoring Pipeline

```mermaid
flowchart TD
    InputData["SOS Input Payload: Emergency Type, Description, Medical Condition, Missing Person Desc, Age, Landmark"] --> InitScore["Initialize Base Priority Score: 30 Points"]

    InitScore --> Stage1{"Stage 1: Emergency Type Weighting"}
    Stage1 -->|Earthquake / Collapse| +25pts["+25 Points"]
    Stage1 -->|Fire Incident| +20pts["+20 Points"]
    Stage1 -->|Flood / Medical / Missing| +15pts["+15 Points"]
    Stage1 -->|Road Accident| +12pts["+12 Points"]
    Stage1 -->|Other / General| +5pts["+5 Points"]

    +25pts & +20pts & +15pts & +12pts & +5pts --> Stage2{"Stage 2: NLP Multi-Keyword Scanner"}
    
    subgraph KeywordMatrix["Keyword Scan & Point Assignment Matrix"]
        K1["drowning, trapped, pregnant"] -->|+30 Points Each| Accumulate
        K2["bleeding, infant, baby, cardiac, stroke, explosion, submerged"] -->|+25 Points Each| Accumulate
        K3["water 5ft, child, heart, unconscious, chemical, seizure"] -->|+20 Points Each| Accumulate
        K4["roof, diabetic, elderly, senior, fire_spread, gas"] -->|+15 Points Each| Accumulate
    end

    Stage2 --> KeywordMatrix
    Accumulate --> Stage3{"Stage 3: Demographics & Special Conditions"}

    Stage3 -->|Child Age <= 12 or <= 5| +25Age["+20 to +25 Points"]
    Stage3 -->|Elderly Age >= 60 or >= 65| +20Age["+20 Points"]
    Stage3 -->|Medical: Cardiac / Pregnancy / Bleeding| +30Med["+15 to +30 Points"]

    +25Age & +20Age & +30Med & Stage3 --> BoundedCalc["Normalize Score: Math.max(1, Math.min(100, Score))"]

    BoundedCalc --> Classification{"Stage 4: Priority Badge Classification"}

    Classification -->|Score >= 80| RED["🔴 RED / CRITICAL ALERT\n- Loud Audio Alarm in Command Center\n- Top Queue Priority for Boat & Helicopter Rescue"]
    Classification -->|50 <= Score < 80| YELLOW["🟡 YELLOW / URGENT PRIORITY\n- High Priority Dispatch Queue\n- Medical Consultation & Shelter Priority"]
    Classification -->|Score < 50| GREEN["🟢 GREEN / STANDARD PRIORITY\n- Standard Monitoring Queue\n- Scheduled Supply Distribution"]
```

---

### 4. Disaster-Aware Dynamic Pathfinding (Leaflet.js Hazard Avoidance)

```mermaid
flowchart TD
    Origin["Origin: Rescuer / Victim GPS Coordinates"] --> Target["Target Destination: Shelter Coordinates"]
    Target --> Hazards["Fetch Active Hazard Polygons (Inundated Underpasses, Flood Extents)"]
    Hazards --> InjectGIS["Inject Avoidance Geometry into Leaflet Engine"]
    InjectGIS --> RouteCheck{"Does Direct Path Intersect Hazard Polygon?"}
    RouteCheck -- "Yes (Path Blocked)" --> Reroute["Reroute around Blocked Zone via Safe Waypoints"]
    RouteCheck -- "No (Path Clear)" --> Direct["Keep Direct Evacuation Path"]
    Reroute --> Render["Render Safe Evacuation Route on Map"]
    Direct --> Render
```

---

### 5. Rescuer Skill-Matching & Dispatch Pipeline

```mermaid
flowchart TD
    AdminDash["Command Room Dispatches Incident Task"] --> QueryEngine["Skill-Matching Query Engine"]
    QueryEngine --> QueryDB["Query Roles: Role='Swimmer' AND Status='Available'"]
    QueryDB --> Haversine["Calculate Haversine Distance between Rescuer & Incident"]
    Haversine --> Rank["Rank Top Nearest Skill-Matched Volunteers"]
    Rank --> Push["Push Dispatch Notification"]
    Push --> V1["Volunteer 1 (Swimmer - 300m)"]
    Push --> V2["Volunteer 2 (Swimmer - 600m)"]
    V1 --> Status["Task Status: RESCUE_IN_PROGRESS"]
```

---

### 6. Relational Database ERD Schema

```mermaid
erDiagram
    reports ||--o| volunteers : "assigned_volunteer_id"
    reports ||--o| agencies : "assigned_agency_id"
    shelters ||--o{ resources : "shelter_id"
    admins ||--o{ audit_logs : "admin_email"

    reports {
        uuid id PK
        text type "fire, flood, medical, missing_person, earthquake, accident, other"
        text status "pending, in_progress, resolved"
        integer priority_score "1 to 100"
        text priority_label "RED, YELLOW, GREEN"
        float8 latitude
        float8 longitude
        text landmark
        text reporter_name
        text reporter_phone
        text description
        jsonb triage_factors "Breakdown array"
        timestamptz created_at
    }

    volunteers {
        uuid id PK
        text name
        text phone
        text_array skills "medical, search_rescue, driving, logistics"
        float8 latitude
        float8 longitude
        text status "available, on_duty, offline"
    }

    shelters {
        uuid id PK
        text name
        text address
        float8 latitude
        float8 longitude
        integer capacity
        integer occupancy
        text status "open, full, closed"
    }

    agencies {
        uuid id PK
        text name
        text type "fire_department, police, ndrf, hospital, ngo"
        text contact_phone
    }

    resources {
        uuid id PK
        text name
        text category "food, water, medical, clothing, fuel"
        integer quantity
        uuid shelter_id FK
    }

    alerts {
        uuid id PK
        text title
        text message
        text severity "info, warning, critical"
    }

    audit_logs {
        uuid id PK
        text admin_email
        text action
        text entity_type
        timestamptz created_at
    }

    safety_checkins {
        uuid id PK
        text full_name
        text phone
        text status "safe, need_assistance"
    }
```

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Next.js Command Stack** | Next.js 13 (App Router), TypeScript | Full-featured command center client with SSR & hash router |
| **Vite Web Frontend** | React 19, Vite 8 | High-performance SPA client framework & rapid HMR |
| **Styling & UI** | Tailwind CSS 3.4, shadcn/ui, Radix UI | Modern dark mode, glassmorphic UI & custom design tokens |
| **Database & Realtime** | Supabase (PostgreSQL + WebSockets) | Database storage, RLS security policies, & real-time push |
| **Analytics** | Recharts | Dynamic interactive data visualizations & charts |
| **Animations** | Framer Motion 11 | Smooth micro-animations & modal transitions |
| **GIS Mapping** | Leaflet.js 1.9 | Real-time map rendering, hazard polygon display & route planning |
| **AI Engine Hub** | Python 3.10+, FastAPI | SOS Urgency Triage, PFA Chatbot, Damage Assessment & SAR Flood Mapping |

---

## 🌟 Key Functional Features

1. **🚨 1-Tap SOS Emergency Button:** Zero-friction distress trigger capturing live browser GPS coordinates.
2. **📝 Multi-Step Emergency Report Form:** Comprehensive intake supporting medical conditions, missing person details, landmark landmarks, and audio/video media uploads.
3. **🔍 Incident Tracking ID Lookup (`report-tracker.tsx`):** Real-time status lookup using emergency incident tracking IDs.
4. **🧠 Real-time AI Triage Scoring:** Dual TypeScript and Python triage matrix assigning `RED`, `YELLOW`, or `GREEN` priority badges.
5. **✅ Safety Status Check-ins:** Allows citizens in affected zones to check in as "Safe" or "Need Assistance".
6. **🏠 Nearby Shelter Finder:** Real-time distance calculation to open relief shelters using the Haversine geo-spatial formula.
7. **📢 Public Warning Alerts:** Broadcast feed pushed directly from the Command Center.
8. **🌐 Multi-lingual Engine:** Instant language switching across **English**, **Hindi (हिंदी)**, and **Odia (ଓଡ଼ିଆ)**.
9. **🎛️ Command Center (11 Views):** Overview, Live SOS Stream with real-time sound alarms, Incident Reports, Missing Persons, Volunteers, Shelters, Agencies, Communications, Recharts Analytics, Audit Logs, and Settings.
10. **🤖 Python AI Microservices (`apps/ai-engine`):**
    - `triage.py`: Explainable SOS urgency scoring.
    - `damage_assessment.py`: Anti-fraud property damage photo validation & pHash duplicate detection.
    - `pfa_chatbot.py`: Psychological First Aid with 4-second breathing and 5-4-3-2-1 grounding exercises.
    - `satellite_flood_mapping.py`: SAR Sentinel-1 satellite radar metadata processing generating GeoJSON flood polygons.

---

## 📁 Repository Directory Structure

```
SIH-DM/
├── frontend-AapdaSetu/                 # Primary React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/                 # UI components (Navbar, Footer, Sidebar)
│   │   ├── layouts/                    # Main, Citizen, Admin, & Volunteer layout wrappers
│   │   ├── pages/                      # Feature pages (SOS, Alerts, Routes, Damage, etc.)
│   │   ├── App.jsx                     # Top-level routing switchboard
│   │   └── main.jsx                    # Vite application entry point
│   ├── package.json
│   └── vite.config.js
│
├── apps/
│   └── ai-engine/                      # Python AI Microservice Engine
│       └── app/
│           ├── main.py                 # AI Microservice integration harness & router
│           ├── triage.py               # Explainable SOS urgency scoring engine
│           ├── damage_assessment.py    # Photo anti-fraud & damage grading
│           ├── pfa_chatbot.py          # Psychological First Aid bot engine
│           └── satellite_flood_mapping.py # SAR satellite flood polygon generator
│
├── README.md                           # Master system documentation
├── flow.md                             # System workflow and architecture documentation
├── projectrequirement.md               # Scope and master feature matrix
├── tech.md                             # Technical architecture stack guide
└── LICENSE                             # MIT License
```

---

## 🚦 Getting Started & Local Development

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **npm**: v9.0.0 or higher

### 1. Web Application (`frontend-AapdaSetu`)
```bash
cd frontend-AapdaSetu
npm install
npm run dev      # Starts dev server on http://localhost:5173
```

### 2. Command Center Platform (`SOS-project with bolt/project`)
```bash
cd "../SOS-project with bolt/project"
npm install
npm run dev      # Starts dev server on http://localhost:3000
```
- Citizen Portal: `http://localhost:3000/`
- Admin Command Center: `http://localhost:3000/#admin`

### 3. Python AI Engine (`apps/ai-engine`)
```bash
cd apps/ai-engine
python app/main.py   # Executes AI microservice integration harness
```

---

## 📜 License & Acknowledgments

- Built under the **Smart India Hackathon (SIH) Disaster Management Initiative**.
- Designed for humanitarian disaster relief and emergency response worldwide.
- Open-source under the [MIT License](LICENSE).
