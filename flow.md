# 🔄 AapdaSetu — Comprehensive System Flow & Architecture Workflows

> **Exhaustive operational workflows, sequence diagrams, AI decision trees, real-time event streaming flows, and multi-agency command processes across the AapdaSetu platform.**

---

## 📑 Table of Contents
1. [Global End-to-End Multi-Stack System Workflow](#1-global-end-to-end-multi-stack-system-workflow)
2. [Citizen 1-Tap SOS & Geolocation Ingestion Flow](#2-citizen-1-tap-sos--geolocation-ingestion-flow)
3. [Multi-Step Intelligent Incident Reporting Flow](#3-multi-step-intelligent-incident-reporting-flow)
4. [AI Multi-Factor Urgency Triage & Scoring Decision Tree](#4-ai-multi-factor-urgency-triage--scoring-decision-tree)
5. [Command Center Real-Time Event Bus & Audio Alarm Pipeline](#5-command-center-real-time-event-bus--audio-alarm-pipeline)
6. [Rescuer Skill-Matching, Distance Calculation & Dispatch Flow](#6-rescuer-skill-matching-distance-calculation--dispatch-flow)
7. [Disaster-Aware GIS Pathfinding & Flood Hazard Avoidance](#7-disaster-aware-gis-pathfinding--flood-hazard-avoidance)
8. [Computer Vision Damage Assessment & SDRF Anti-Fraud Claim Flow](#8-computer-vision-damage-assessment--sdrf-anti-fraud-claim-flow)
9. [AapdaMitra AI Psychological First Aid & Emergency Escalation](#9-aapdamitra-ai-psychological-first-aid--emergency-escalation)
10. [Missing Persons Registry & AI Match Workflow](#10-missing-persons-registry--ai-match-workflow)
11. [Multi-Channel Emergency Alert Broadcast Pipeline](#11-multi-channel-emergency-alert-broadcast-pipeline)
12. [Offline PWA Service Worker & BLE Mesh Synchronization Flow](#12-offline-pwa-service-worker--ble-mesh-synchronization-flow)

---

## 1. Global End-to-End Multi-Stack System Workflow

```mermaid
graph TB
    subgraph CitizenClientTier["🌐 CITIZEN WEB CLIENT (Zero-Auth)"]
        A1["Citizen Accesses Portal\n(http://localhost:5173/)"] --> A2{"Select Emergency Action"}
        A2 -->|"1-Tap SOS"| A3["1-Tap Emergency SOS (/sos)"]
        A2 -->|"Report Incident"| A4["Multi-Step Incident Form (/report)"]
        A2 -->|"Track Rescue"| A5["Live Status Tracker (/track)"]
        A2 -->|"Safety Check-In"| A6["Community Registry (/check-in)"]
        A2 -->|"Find Shelter"| A7["Relief Camp Finder (/shelters)"]
        A2 -->|"Safe Evacuation"| A8["GIS Hazard Routing (/safe-routes)"]
        A2 -->|"Missing Persons"| A9["Missing Registry (/missing-persons)"]
        A2 -->|"Damage Claim"| A10["SDRF Photo Claim (/report-damage)"]
        A2 -->|"AapdaMitra AI"| A11["Crisis AI Chatbot (/pfa-chat)"]
    end

    subgraph LogicLayer["⚡ LOGIC & TRIAGE ENGINES"]
        A3 & A4 --> B1["Multi-Factor AI Triage Engine\n(computeTriage in lib/triage.ts)"]
        A6 --> B2["Record Check-In (State: Safe / Assistance)"]
        A7 --> B3["Haversine Proximity Calculation Engine"]
        A8 --> B4["Leaflet GIS Pathfinding & Hazard Avoidance"]
        A10 --> B5["AI Computer Vision Damage Classifier"]
        A11 --> B6["Psychological First Aid & Anti-Reasoning Engine"]
    end

    subgraph RealtimeBusTier["📡 REALTIME EVENT BUS & WEBSOCKETS"]
        B1 --> C1["Broadcast: IncidentRegistered (Payload with Tracking ID)"]
        B2 --> C2["Broadcast: CheckinPosted"]
        B5 --> C3["Broadcast: DamageClaimSubmitted"]
    end

    subgraph CommandCenterTier["🚨 MULTI-AGENCY COMMAND CENTER (#admin)"]
        C1 --> D1["Live SOS Stream (Audible Siren on RED Alert)"]
        D1 --> D2["Skill-Matching Auto-Dispatch Modal"]
        D2 --> D3["Assign Volunteer / NDRF / SDRF / Fire / Police"]
        D3 --> D4["Status Transition: pending -> in_progress -> resolved"]
        C3 --> D5["SDRF Compensation Review & DBT Clearance"]
    end

    subgraph VolunteerTier["🧑‍🚒 FIELD RESPONDER PORTAL (#volunteer)"]
        D3 --> E1["Push Task Notification to Assigned Responder"]
        E1 --> E2["Turn-by-Turn GPS Navigation to Incident Site"]
        E2 --> E3["Update Rescue Milestones (On Scene -> Evacuated)"]
    end

    E3 --> A5
```

---

## 2. Citizen 1-Tap SOS & Geolocation Ingestion Flow

```mermaid
sequenceDiagram
    autonumber
    actor Victim as 🆘 Citizen in Distress
    participant Browser as 📱 Mobile Web Browser
    participant GeoAPI as 🛰️ HTML5 Geolocation API
    participant Triage as 🧠 AI Triage Engine
    participant EventBus as ⚡ Realtime Event Bus
    actor Operator as 🚨 Control Room Operator

    Victim->>Browser: 1. Click 1-Tap Emergency SOS
    Browser->>GeoAPI: 2. Request getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 })
    alt GPS Permission Granted
        GeoAPI-->>Browser: 3a. Return { lat, lng, accuracy: 5.2m }
    else GPS Denied / Timeout
        Browser->>Browser: 3b. Fallback to IP / Cached District Coords (lat: 20.2961, lng: 85.8245)
    end
    Browser->>Triage: 4. Compute fast SOS score (Base 30 + Category + GPS accuracy bonus)
    Triage-->>Browser: 5. Returns { score: 85, label: 'RED', triageFactors: [...] }
    Browser->>EventBus: 6. Dispatch incident report with Tracking ID (e.g. SOS-9X4K2)
    EventBus-->>Operator: 7. Trigger Loud Alarm & Pulsing Beacon on Command Map
    Browser-->>Victim: 8. Show Confirmation Screen with Helpline Numbers (112, 108, 1070) & 1-Tap SMS Fallback
```

---

## 3. Multi-Step Intelligent Incident Reporting Flow

```mermaid
flowchart TD
    Start["Citizen Opens /report"] --> Step1["Step 1: Emergency Category\n(Flood, Fire, Medical, Collapse, Accident, Missing, Other)"]
    
    Step1 --> Step2["Step 2: Auto GPS Geolocation & Landmark Picker\n- High-accuracy GPS Coordinates\n- Interactive Leaflet pin drag / landmark selection"]
    
    Step2 --> Step3["Step 3: Reporter Name & Contact\n- Full Name (Optional)\n- 10-Digit Mobile Number (Mandatory for dispatch)"]
    
    Step3 --> Step4["Step 4: Media Proof Capture (REQUIRED — at least one)\n- Live HTML5 Audio Voice Recording\n- Live HTML5 Video Proof Recording\n- Photo upload\n- Submission blocked until ≥1 item attached"]

    Step4 --> Step5["Step 5: Vulnerability & Description (Description OPTIONAL)\n- Trapped / drowning / unconscious flags\n- Demographic tags: Infant, Child, Pregnant, Senior, Disabled"]

    Step5 --> ProcessPayload["Compile Form Payload & Execute Local Triage Scoring"]
    ProcessPayload --> Submit["Submit to Backend & Realtime Event Bus"]
    Submit --> Success["Generate Tracking ID (e.g. SOS-3M7T1)\n- Direct link to /track?id=SOS-3M7T1\n- Rescue dispatch confirmation"]
```

---

## 4. AI Multi-Factor Urgency Triage & Scoring Decision Tree

```mermaid
flowchart TD
    Payload["Raw Incident Payload"] --> Init["Set Base Score: S = 30"]

    Init --> CatCheck{"Emergency Category Weight (W_cat)"}
    CatCheck -->|Earthquake / Collapse| W1["+25 pts"]
    CatCheck -->|Fire / Explosion| W2["+20 pts"]
    CatCheck -->|Flood / Water Rising| W3["+18 pts"]
    CatCheck -->|Critical Medical / Cardiac| W4["+18 pts"]
    CatCheck -->|Missing Person Search| W5["+15 pts"]
    CatCheck -->|Transit / Road Accident| W6["+12 pts"]
    CatCheck -->|Other / General| W7["+5 pts"]

    W1 & W2 & W3 & W4 & W5 & W6 & W7 --> NLPCheck{"Multi-Lingual Keyword Scanner (W_nlp)"}

    subgraph KeywordScorer["Multi-Lingual Keyword Weight Matrix"]
        K1["'drowning', 'trapped', 'pregnant', 'submerged', 'ଛାତ ଉପରେ', 'ଫସି ରହିଛି', 'डूब रहे हैं'"] -->|+30 pts each (Max +40)| SumK
        K2["'severe bleeding', 'infant', 'cardiac', 'explosion', 'heart attack', 'ରକ୍ତସ୍ରାବ'"] -->|+25 pts each| SumK
        K3["'water 5ft', 'unconscious', 'child', 'snakebite', 'electrocution', 'ବିଦ୍ୟୁତ'"] -->|+20 pts each| SumK
        K4["'elderly', 'senior citizen', 'diabetic', 'asthma', 'no food/water', 'ବୟସ୍କ'"] -->|+15 pts each| SumK
    end

    NLPCheck --> KeywordScorer
    SumK --> DemoMultiplier{"Demographic Multipliers (W_demo)"}

    DemoMultiplier -->|Infant / Child <= 12 yrs| D1["+20 to +25 pts"]
    DemoMultiplier -->|Senior Citizen >= 60 yrs| D2["+20 pts"]
    DemoMultiplier -->|Pregnancy / Cardiac / Bleeding| D3["+20 to +30 pts"]

    D1 & D2 & D3 & DemoMultiplier --> Clamp["Calculate Total Score:\nScore = Math.max(1, Math.min(100, S + W_cat + W_nlp + W_demo))"]

    Clamp --> PrioritySplit{"Score Range"}
    PrioritySplit -->|80 <= Score <= 100| RED["🔴 RED / CRITICAL ALERT\n- Command Center Siren Active\n- Immediate Boat / Heli / Ambulance Dispatch"]
    PrioritySplit -->|50 <= Score < 80| YELLOW["🟡 YELLOW / URGENT\n- High Priority Dispatch Queue\n- Field Volunteer Mobilization"]
    PrioritySplit -->|Score < 50| GREEN["🟢 GREEN / ADVISORY\n- Standard Queue\n- Scheduled Relief Supply Distribution"]
```

---

## 5. Command Center Real-Time Event Bus & Audio Alarm Pipeline

```mermaid
flowchart TD
    EventSource["Incident Event Ingested (Realtime Event Bus)"] --> PriorityCheck{"Incident Priority Label"}

    PriorityCheck -->|Priority == 'RED' (Score >= 80)| CriticalBranch["Critical Event Pipeline"]
    PriorityCheck -->|Priority == 'YELLOW' or 'GREEN'| StandardBranch["Standard Event Pipeline"]

    CriticalBranch --> AudioAlarm["Trigger Web Audio Context Alarm\n- Synthesized 880Hz / 440Hz dual-frequency alert siren\n- Browser notification trigger"]
    CriticalBranch --> VisualPulse["Flash Pulsing Red Banner & Pin on Leaflet Map"]
    CriticalBranch --> AutoQueue["Pre-select Top 3 Nearest Skill-Matched Volunteers"]

    StandardBranch --> UpdateCounters["Increment Active Incident Counter"]
    StandardBranch --> AddToFeed["Add Entry to Live Incident Table"]

    AudioAlarm & VisualPulse & AutoQueue --> OperatorAction{"Operator Action"}
    OperatorAction -->|Assign Volunteer| AssignAction["Update assigned_volunteer_id -> Broadcast Update"]
    OperatorAction -->|Re-route / Triage Adjust| ReTriage["Manually Adjust Priority Score"]
    OperatorAction -->|Mark Resolved| ResolveAction["Set status: resolved -> Log to Audit Trail"]
```

---

## 6. Rescuer Skill-Matching, Distance Calculation & Dispatch Flow

```mermaid
flowchart TD
    IncidentLoc["Incident Geolocation: (lat_i, lng_i)\nEmergency Type: e.g. 'Flood' (Requires Swimmer / Boat)"] --> FetchVolunteers["Fetch Available Volunteers: status == 'available'"]
    
    FetchVolunteers --> FilterSkills{"Filter by Required Skill"}
    FilterSkills -->|Match Found| SkillList["Filtered Candidates (e.g. skills.includes('search_rescue'))"]
    FilterSkills -->|No Exact Match| AllList["Fallback to All Available Volunteers"]

    SkillList & AllList --> HaversineCalc["Execute Haversine Distance Formula for each candidate:\nd = 2R * asin(sqrt(sin^2(dlat/2) + cos(lat1)*cos(lat2)*sin^2(dlng/2)))"]

    HaversineCalc --> SortRank["Sort Candidates in Ascending Distance Order\n(Rank 1: Nearest Skill-Matched Volunteer)"]

    SortRank --> DispatchCard["Render Dispatch Recommendations:\n1. Rajesh Nayak (Swimmer, 350m away, ETA ~4 mins)\n2. Priya Mohanty (Paramedic, 800m away, ETA ~9 mins)"]

    DispatchCard --> ExecuteDispatch["Operator Clicks 'Dispatch Responder'"]
    ExecuteDispatch --> NotifyVolunteer["Push Task to Volunteer Dashboard & Set Volunteer Status to 'on_duty'"]
```

---

## 7. Disaster-Aware GIS Pathfinding & Flood Hazard Avoidance

```mermaid
flowchart TD
    UserCoords["User Geolocation: (lat_u, lng_u)"] --> DestCoords["Destination Relief Shelter: (lat_s, lng_s)"]
    
    DestCoords --> FetchHazards["Load Active Hazard Layers:\n- Sentinel-1 SAR Radar Flood Inundation Polygons\n- Collapsed Bridges & Flooded Underpass Waypoints"]

    FetchHazards --> GeoIntersect{"Does LineSegment(User, Shelter) intersect Hazard Polygon?"}

    GeoIntersect -- "No Hazard Intersection" --> DirectCorridor["Generate Direct Walking Path\n- Color: Emerald Green\n- Tag: 'Fastest Direct Route'"]
    
    GeoIntersect -- "Hazard Inundation Detected" --> DetourAlgorithm["Execute Obstacle Avoidance Algorithm\n1. Calculate polygon convex hull vertices\n2. Determine shortest external bypass waypoints\n3. Construct Safe Detour Polyline"]

    DetourAlgorithm --> SafeCorridor["Generate AI Safe Flood-Free Detour\n- Color: Dodger Blue with pulsing border\n- Tag: 'AI Safe Evacuation Corridor'"]

    DirectCorridor & SafeCorridor --> RenderMap["Render on Leaflet.js Interactive Map with Hazard Layers"]
```

---

## 8. Computer Vision Damage Assessment & SDRF Anti-Fraud Claim Flow

```mermaid
flowchart TD
    CitizenUpload["Citizen Uploads Damaged House/Building Photo (/report-damage)"] --> ClientHash["Compute 64-bit Perceptual Hash (pHash) & EXIF Geotag"]
    
    ClientHash --> DuplicateCheck{"pHash Hamming Distance < 5 against DB?"}
    
    DuplicateCheck -- "Yes (Duplicate / Stolen Photo)" --> FraudFlag["Flag as Duplicate Claim\n- Mark claim status: 'FLAGGED_DUPLICATE'\n- Notify Command Center Fraud Audit Queue"]
    
    DuplicateCheck -- "No (Unique Proof)" --> VisionML["Execute Computer Vision Damage Classifier"]

    VisionML --> GradeModel{"Model Classification Output"}
    GradeModel -->|Total Structural Destruction (Score > 0.85)| G1["Grade 1: Total Collapse\nEligible Grant: ₹1,20,000"]
    GradeModel -->|Severe Wall/Roof Cracking (Score 0.50 - 0.85)| G2["Grade 2: Severe Structural Damage\nEligible Grant: ₹65,000"]
    GradeModel -->|Minor Inundation / Superficial (Score < 0.50)| G3["Grade 3: Partial / Minor Damage\nEligible Grant: ₹25,000"]

    G1 & G2 & G3 --> ClaimReport["Generate SDRF Disaster Relief Claim Dossier\n- Unique Claim ID (e.g. SDRF-2026-8891)\n- Direct Bank Transfer (DBT) verification form"]

    ClaimReport --> AdminQueue["Command Center SDRF Disbursement Review"]
```

---

## 9. AapdaMitra AI Psychological First Aid & Emergency Escalation

```mermaid
flowchart TD
    InputMsg["User Message in AapdaMitra AI Chat"] --> IntentScan{"Analyze Crisis & Emotional Tone"}

    IntentScan -->|Panic / Hyperventilation / Shaking| PanicFlow["Trigger 4-4-4 Box Breathing Protocol\n- Inhale 4s -> Hold 4s -> Exhale 4s interactive visualizer"]
    
    IntentScan -->|Trauma / Dissociation / Disorientation| GroundingFlow["Trigger 5-4-3-2-1 Sensory Grounding\n- 5 Things to see, 4 to touch, 3 to hear, 2 to smell, 1 to taste"]

    IntentScan -->|Life-Threatening Emergency Keywords| CriticalEmergency["Trigger Immediate Escalation Action Card\n- Red Emergency Call Banner (112 / 108)\n- Rescue Callback Form (Immediate volunteer dispatch)"]

    IntentScan -->|General Disaster Inquiry| StandardPFA["Empathetic Crisis Guidance & Safety Advice"]

    CriticalEmergency --> CallbackSubmit["User submits 10-digit mobile number"]
    CallbackSubmit --> AutoCreateSOS["Auto-Generate Priority SOS Dispatch in Command Queue"]

    PanicFlow & GroundingFlow & StandardPFA --> OutputFilter["Sanitize Response:\n- Strip reasoning markers (<think>, rules, thoughts)\n- Remove markdown asterisks (*, **)\n- Format clean bullet points"]

    OutputFilter --> SendToChat["Deliver Multi-Lingual Safety Response to User"]
```

---

## 10. Missing Persons Registry & AI Match Workflow

```mermaid
flowchart LR
    ReportMissing["Family Member Reports Missing Person\n- Name, Age, Gender, Last Seen Location\n- Clothes Description & Photo Upload"] --> SaveRegistry["Save to 'missing_persons' Registry (Status: 'open')"]

    SaveRegistry --> PublicSearch["Public Search & Shelter Match Feed"]

    RescueSquad["Field Rescue Team / Shelter Intake Officer"] --> SearchShelter["Search by clothing / location / visual traits"]

    PublicSearch & SearchShelter --> FoundMatch{"Match Identified?"}

    FoundMatch -- "Yes" --> VerifyMatch["Verify Guardian Contact & Coordinates"]
    VerifyMatch --> UpdateStatus["Update Status: 'matched' -> 'resolved'"]
    UpdateStatus --> Reunited["Issue Family Reunification Confirmation Notice"]
```

---

## 11. Multi-Channel Emergency Alert Broadcast Pipeline

```mermaid
flowchart TD
    Operator["Command Center Operator Composes Alert (/admin/communications)"] --> Configure["Select Target Parameters:\n- Severity: Info / Warning / Critical\n- Channels: Web Push, SMS, WhatsApp, All\n- Affected District: e.g. Khordha, Cuttack, Puri"]

    Configure --> DispatchTrigger["Click 'Broadcast Emergency Bulletin'"]

    DispatchTrigger --> ChannelRouter{"Channel Multiplexer"}

    ChannelRouter -->|Web Push & Public Feed| WebChannel["Publish to 'alerts' Channel -> Ingested by Citizen App & Mobile Drawer"]
    ChannelRouter -->|SMS Channel| TwilioAPI["Twilio Telecom Gateway -> Broadcast SMS to Registered Numbers in Geofence"]
    ChannelRouter -->|WhatsApp Channel| WhatsAppAPI["WhatsApp Cloud API -> Send Template Message with Safety PDF / Links"]

    WebChannel & TwilioAPI & WhatsAppAPI --> AuditRecord["Write Broadcast Entry to 'audit_logs' with Operator Stamp"]
```

---

## 12. Offline PWA Service Worker & BLE Mesh Synchronization Flow

```mermaid
flowchart TD
    UserAction["Citizen Submits SOS / Report while Offline (No Cell Network)"] --> CheckOnline{"navigator.onLine?"}

    CheckOnline -- "Online" --> DirectAPI["POST immediately to Backend API"]
    
    CheckOnline -- "Offline (Cellular Blackout)" --> OfflineHandler["PWA Service Worker (sw.js) Intercepts Request"]

    OfflineHandler --> StoreIndexedDB["Store Payload in IndexedDB Outbox Queue ('aapdasetu_offline_queue')"]
    OfflineHandler --> UserFeedback["Show 'Queued Offline — Will sync automatically on reconnect'"]

    StoreIndexedDB --> SyncTrigger{"Network Reconnection Event (window 'online')"}
    SyncTrigger --> ProcessQueue["Iterate Queue & Replay HTTP POST Requests to Server"]
    ProcessQueue --> ClearOutbox["Clear Outbox & Display Sync Success Notification"]

    OfflineHandler --> MeshFallback["Optionally Relay Distress Packet via BitChat BLE Mesh Protocol"]
```
