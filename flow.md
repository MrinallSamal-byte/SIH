# 🔄 AapdaSetu System Flow and Architecture Diagrams

This document details the operational flows, client navigation routes, AI microservice pipelines, real-time WebSocket synchronization mechanics, and command center workflows across the AapdaSetu platform.

---

## 1. Global End-to-End Multi-Stack System Workflow

```mermaid
flowchart TD
    subgraph CitizenClient["CITIZEN WEB CLIENTS (React / Next.js)"]
        A1["Citizen Accesses Web Portal"] --> A2{"Select Action"}
        A2 -->|"1-Tap SOS"| A3["Trigger Instant SOS Alert"]
        A2 -->|"Incident Report"| A4["Submit Detailed Incident Form"]
        A2 -->|"Safety Check-In"| A5["Register Status: Safe / Need Assistance"]
        A2 -->|"Shelter Finder"| A6["Locate Nearby Shelters via Haversine"]
        A2 -->|"PFA Chatbot"| A7["Interact with PFA Bot (/safety)"]
        A2 -->|"Safe Navigation"| A8["Calculate Safe Route (/safe-routes)"]
        A2 -->|"Report Damage"| A9["Upload Damage Photo (/report-damage)"]
    end

    subgraph LogicLayer["LOGIC & TRIAGE ENGINES"]
        A3 & A4 --> B1["Automated AI Triage Engine\n(computeTriage in lib/triage.ts)"]
        A5 --> B2["Write to safety_checkins Table"]
        A6 --> B3["Compute Proximity in KM via Haversine"]
        A7 --> B4["PFA Chatbot Engine (pfa_chatbot.py)\n4-Sec Breathing & 5-4-3-2-1 Grounding"]
        A8 --> B5["Leaflet GIS Avoidance Geometry"]
        A9 --> B6["Anti-Fraud Damage Engine (damage_assessment.py)\nEXIF GPS & pHash Verification"]
    end

    subgraph SupabaseTier["SUPABASE BACKEND & REALTIME"]
        B1 --> C1["INSERT into 'reports' Table (Priority: RED / YELLOW / GREEN)"]
        C1 --> C2["Fire postgres_changes Realtime Event"]
    end

    subgraph CommandCenter["INCIDENT COMMAND DASHBOARD (#admin)"]
        C2 --> D1["Push Alert to Live SOS Stream + Play Audio Alarm on RED"]
        D1 --> D2["Open Incident Dispatch Modal & Assign Responder"]
        D2 --> D3["Update Status: pending -> in_progress -> resolved"]
        D3 --> D4["Write Compliance Audit Log to audit_logs Table"]
        B6 --> D5["Auto-Calculate eligible SDRF Compensation"]
    end
```

---

## 2. Citizen User Flow & Multi-Modal Routing

```mermaid
flowchart TD
    Start([User Opens Web App]) --> Router{Hash Router Check}
    
    Router -->|Hash = '#admin'| AdminAuthGate[Admin Login Form]
    Router -->|Default Route '/'| CitizenApp[Citizen Public Interface]

    subgraph CitizenFeatures["Citizen Interactive Modules"]
        CitizenApp --> SOS["1-Tap SOS Emergency"]
        CitizenApp --> Report["Full Incident Report Form"]
        CitizenApp --> Checkin["Safety Status Check-In"]
        CitizenApp --> Shelter["Nearby Shelter Finder"]
        CitizenApp --> Warning["Live Public Warnings"]
    end

    SOS -->|Navigator Geolocation| CaptureGPS[Auto-Fetch GPS Coordinates]
    CaptureGPS --> FastTriage[Execute Fast Triage Engine]
    FastTriage -->|Score & Label RED/YELLOW/GREEN| PushSOS[(PostgreSQL 'reports' Table)]
    PushSOS --> SuccessSOS[Instant Alert Dispatched + Tracking ID]

    Report --> FormCollect[Collect Emergency Type, Medical, Media, Landmark]
    FormCollect --> MediaProc{Media Upload?}
    MediaProc -->|Audio/Video Data URL| AttachMedia[Attach Base64 Media Payload]
    MediaProc -->|No Media| FullTriage
    AttachMedia --> FullTriage[Execute Full Triage Matrix Engine]
    FullTriage --> PushReport[(PostgreSQL 'reports' Table)]
    PushReport --> SuccessReport[Report Registered + Tracking ID]

    Checkin --> PushCheckin[(PostgreSQL 'safety_checkins' Table)]
    PushCheckin --> ConfirmCheckin[Safety Status Recorded]

    Shelter --> HaversineCalc[Calculate Haversine Distance to Shelters]
    HaversineCalc --> RenderShelters[Render Shelter Cards Sorted by Distance]

    Warning --> AlertStream[Listen to Supabase 'alerts' Channel]
    AlertStream --> RenderAlerts[Display Emergency Banners & Severity Badges]
```

---

## 3. Admin Command Center Architecture & Modular Subsystems

```mermaid
flowchart TD
    subgraph AuthGate["Authentication & Session Management"]
        AdminLogin["LoginForm (Email & Password)"] --> RPCVerify["Call Supabase RPC: verify_admin_login()"]
        RPCVerify -->|Valid Credentials| SaveSession["Store Session Token ('aapdasetu_admin_session')"]
        RPCVerify -->|Invalid Credentials| AuthError["Display Error Toast"]
        SaveSession --> MountShell["Mount Admin Shell Component"]
    end

    subgraph ShellHeader["Command Center Header Controls"]
        MountShell --> Meter["Realtime Crisis Severity Gauge (0-100 Score)"]
        MountShell --> AudioToggle["Realtime Audio Alarm Switch"]
        MountShell --> ProfileMenu["Admin Profile & Sign Out"]
    end

    subgraph ModuleRouter["11 Specialized Command Center Subsystems"]
        MountShell --> View1["1. Overview & Key Performance Gauge"]
        MountShell --> View2["2. Live SOS Stream (Audio Alert on RED)"]
        MountShell --> View3["3. Incident Reports Management & Triage Filter"]
        MountShell --> View4["4. Missing Persons Registry & Case Tracking"]
        MountShell --> View5["5. Volunteer Roster & Skill Dispatch"]
        MountShell --> View6["6. Relief Shelters & Capacity Management"]
        MountShell --> View7["7. Multi-Agency Response Roster"]
        MountShell --> View8["8. Multi-Channel Alert Broadcaster"]
        MountShell --> View9["9. Crisis Analytics & Recharts Visualizer"]
        MountShell --> View10["10. Compliance & Security Audit Logs"]
        MountShell --> View11["11. System Settings & API Integrations"]
    end

    subgraph InteractiveDispatch["Responding & Triage Modal"]
        View2 & View3 --> OpenModal["Open Report Detail Modal"]
        OpenModal --> AssignVol["Assign Field Volunteer"]
        OpenModal --> AssignAgency["Assign Emergency Response Agency"]
        OpenModal --> UpdateStatus["Update Status: pending -> in_progress -> resolved"]
        UpdateStatus --> WriteAudit["Insert Audit Log Entry into audit_logs"]
        WriteAudit --> DBCommit[("PostgreSQL Database Update")]
    end
```

---

## 4. AI Triage & Priority Scoring Flow (`triage.ts` & `triage.py`)

```mermaid
flowchart TD
    A["Ingest SOS Payload (Type, Description, Medical, Missing Desc, Age, Landmark)"] --> B["Start Base Score = 30 Points"]
    B --> C["Stage 1: Add Base Weight by Emergency Type (Fire +20, Earthquake +25, Flood +15, Accident +12)"]
    C --> D["Stage 2: Scan Text for Priority Keywords (drowning +30, trapped +30, roof +25, 5ft water +20, bleeding +25, pregnant +30)"]
    D --> E{"Stage 3: Demographic & Medical Check"}
    E -->|"Age <= 12 or <= 5"| BoostChild["+20 to +25 Priority Boost"]
    E -->|"Age >= 60 or >= 65"| BoostElder["+20 Priority Boost"]
    E -->|"Medical Condition (Cardiac, Pregnancy, Bleeding)"| BoostMed["+15 to +30 Priority Boost"]
    BoostChild & BoostElder & BoostMed & E --> FinalCalc["Normalize & Clamp Score between 1 and 100"]
    
    FinalCalc --> Rank{"Classify Urgency Tier"}
    Rank -- "Score >= 80" --> RED["🔴 CRITICAL RED ALERT\n(Triggers Sound Alarm & Top Dispatch Queue)"]
    Rank -- "50 <= Score < 80" --> YELLOW["🟡 HIGH YELLOW ALERT\n(Medical Queue & Shelter Priority)"]
    Rank -- "Score < 50" --> GREEN["🟢 NORMAL GREEN ALERT\n(Relief Food & Supply Queue)"]
```

---

## 5. Supabase Real-Time Event Synchronization & Responding Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as 📱 Citizen (In Distress)
    participant App as 💻 Client Frontend (Next.js)
    participant Triage as 🧠 Triage Engine (lib/triage.ts)
    participant Supabase as ⚡ Supabase Client (HTTP/REST)
    participant Postgres as 🗄️ PostgreSQL Database
    participant Realtime as 📡 Supabase Realtime (WebSockets)
    actor Admin as 🎛️ Admin Dispatcher (Command Center)
    actor Volunteer as 👷 Field Volunteer / Agency Unit

    Citizen->>App: 1. Click 1-Tap SOS / Submit Report Form
    App->>App: 2. Capture Geolocation (Lat/Lng) via Navigator API
    App->>Triage: 3. Compute Urgency Score & Priority Tag
    Triage-->>App: 4. Returns { score: 85, label: 'RED', factors: [...] }
    App->>Supabase: 5. INSERT into 'reports' table
    Supabase->>Postgres: 6. Execute RLS Check & Save Row
    Postgres-->>Realtime: 7. Fire 'postgres_changes' INSERT Event
    Realtime-->>Admin: 8. Push Realtime WebSocket Event to Admin Dashboard
    Admin->>Admin: 9. Play Loud Audio Alarm & Highlight RED SOS Feed
    Admin->>App: 10. Open Report Detail & Assign Volunteer/Agency Unit
    App->>Supabase: 11. UPDATE 'reports' (status='in_progress', assigned_volunteer_id=...)
    Supabase->>Postgres: 12. Commit Transaction & Trigger update_updated_at()
    Postgres-->>Realtime: 13. Broadcast UPDATE Event
    Realtime-->>Admin: 14. Update UI Status to 'In Progress'
    Admin->>Volunteer: 15. Dispatch Field Unit to Incident Coordinates
    Volunteer->>Admin: 16. Report Incident Resolved
    Admin->>App: 17. Update Status to 'Resolved' + Add Resolution Notes
    App->>Supabase: 18. INSERT into 'audit_logs' (Action: 'RESOLVE_REPORT')
    Supabase->>Postgres: 19. Persist Audit Record
```

---

## 6. Zero User-Side Authentication Access Flow

```mermaid
flowchart LR
    User["Victim / Citizen"] --> App["AapdaSetu Web App"]
    App --> DirectAccess["Immediate Access (Zero Login / Sign-Up)"]
    DirectAccess --> SOS["1-Tap SOS & Emergency Report"]
    DirectAccess --> Tracking["Incident Tracking ID Lookup"]
    DirectAccess --> Checkin["Safety Check-In"]
    DirectAccess --> Shelter["Shelter Finder (Haversine)"]
    DirectAccess --> PFA["PFA Chatbot Grounding"]
    DirectAccess --> Navigation["Safe Navigation Routes"]
    DirectAccess --> Damage["Damage Report Intake"]
```

---

## 7. Python AI Engine Microservice Workflows (`apps/ai-engine`)

```mermaid
flowchart TD
    subgraph DamageAssessment["1. Anti-Fraud Damage Assessment (damage_assessment.py)"]
        PhotoInput["Photo Payload + Reported GPS"] --> EXIFCheck["Extract EXIF Geotag Metadata"]
        EXIFCheck --> DistanceCalc["Compute Distance Delta vs Reported Location"]
        PhotoInput --> pHashCalc["Compute Perceptual Hash (pHash SHA-256)"]
        pHashCalc --> DuplicateCheck{"pHash Match in Claim DB?"}
        DuplicateCheck -- "Yes" --> FlagDuplicate["Flag as Duplicate Fraud Claim"]
        DuplicateCheck -- "No" --> GradeDamage["Grade Damage (FULLY_DESTROYED, MAJOR, MINOR)"]
        GradeDamage --> Compensation["Auto-Calculate SDRF Compensation Amount"]
    end

    subgraph PFAEngine["2. Psychological First Aid Bot (pfa_chatbot.py)"]
        UserMsg["User Distress Message"] --> IntentCheck{"Identify Intent"}
        IntentCheck -- "Panic / Hyperventilation" --> Breathing["Guide 4-Second Box Breathing Protocol"]
        IntentCheck -- "Disorientation" --> Grounding["Guide 5-4-3-2-1 Sensory Grounding Technique"]
        IntentCheck -- "General Distress" --> Empathetic["Provide Empathetic Reassurance & Helpline Info"]
    end

    subgraph SARFloodMapping["3. SAR Satellite Flood Mapping (satellite_flood_mapping.py)"]
        SARMetadata["Sentinel-1 SAR Radar Metadata"] --> Thresholding["Apply Backscatter Thresholding"]
        Thresholding --> PolygonGen["Generate Water Extent GeoJSON Polygons"]
        PolygonGen --> PushGIS["Export GeoJSON to Leaflet Map Layer"]
    end
```
