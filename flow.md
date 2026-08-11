# AapdaSetu System Flow and Architecture Diagrams

This document details the operational flows, microservice interactions, data pipelines, and network routing mechanisms of the AapdaSetu platform. All diagrams use standard Mermaid notation and explicitly demarcate On-Device (Client-Side) execution versus Server-Side execution.

---

## 1. Global End-to-End System Workflow

The diagram below illustrates the end-to-end operational flow from an offline victim submitting an SOS packet to central command center dispatch.

```mermaid
flowchart TD
    subgraph OnDevice["ON-DEVICE (Client-Side / Offline Node)"]
        A1["Victim Spoken / Text SOS"] --> A2["Voice NLP & Intent Extractor"]
        A2 --> A3["RxDB Offline Local Storage"]
        A3 --> A4["Noise Protocol AES-256-CBC Encryption"]
        A4 --> A5["BitChat BLE Mesh Peer Discovery"]
        A5 --> A6["Store-and-Forward Relay Hop"]
    end

    subgraph InternetBridge["P2P INTERNET GATEWAY NODE"]
        A6 --> B1["Peer Node with Internet Connectivity"]
        B1 --> B2["HTTP POST /api/sos Packet Ingestion"]
    end

    subgraph ServerSide["SERVER-SIDE (Node.js Gateway & Microservices)"]
        B2 --> C1["Client IP Rate Limiter"]
        C1 --> C2["UUID De-Duplication Engine"]
        C2 --> C3["Redis Ingestion Message Queue"]
        C3 --> C4["FastAPI AI Engine Hub Port 8000"]
        C4 --> C5["AI Triage Urgency Scoring Engine"]
        C5 --> C6["Database Persistence Engine"]
        C6 --> C7["WebSocket Real-Time Broadcast Port 5000"]
    end

    subgraph CommandCenter["INCIDENT COMMAND DASHBOARD"]
        C7 --> D1["Leaflet.js GIS Command Dashboard"]
        D1 --> D2["Skill-Matched Rescuer Dispatch"]
    end
```

---

## 2. One SOS Per IP Rate Limiting and Ingestion via Redis Queue

To prevent server overload and Denial of Service (DoS) floods during widespread panic, the API Gateway implements IP-based rate limiting, UUID de-duplication, and an asynchronous Redis message queue pipeline.

```mermaid
flowchart TD
    subgraph ClientLayer["ON-DEVICE / CLIENT NODE"]
        REQ["Incoming HTTP POST /api/sos Request"]
    end

    subgraph ServerGateway["SERVER-SIDE API GATEWAY (server.js)"]
        REQ --> IP_CHECK{"Extract Client IP Address<br/>Is IP Rate Limit Exceeded?"}
        
        IP_CHECK -- "Yes (>1 SOS per IP Window)" --> DROP_IP["HTTP 429 Too Many Requests<br/>Reject Packet"]
        IP_CHECK -- "No (Valid Rate)" --> DUP_CHECK{"Check Database Map<br/>Is SOS UUID Already Ingested?"}
        
        DUP_CHECK -- "Yes (Duplicate)" --> DROP_DUP["HTTP 200 DUPLICATE_DROPPED<br/>Silently Drop Duplicate"]
        DUP_CHECK -- "No (New SOS)" --> REDIS_PUSH["Push SOS Payload to Redis Ingestion Queue<br/>redisQueue.push(sosData)"]
        
        REDIS_PUSH --> REDIS_POP["Pop Item from Redis Queue<br/>const rawItem = redisQueue.shift()"]
        REDIS_POP --> TRIAGE_CALL["Execute AI Triage Evaluation<br/>calculateAITriageScore(rawItem)"]
        
        TRIAGE_CALL --> SAVE_DB["Persist Record in In-Memory DB Map<br/>database.set(sos_uuid, finalRecord)"]
        SAVE_DB --> WS_BCAST["Broadcast to WS Clients<br/>broadcastToClients('NEW_SOS_ALERT')"]
        WS_BCAST --> RESP["HTTP 201 INGESTED_AND_TRIAGED Response"]
    end
```

---

## 3. FastAPI AI Microservice Router and Endpoints

All artificial intelligence engines operate inside a single Python FastAPI hub on port 8000. Requests are routed based on endpoint paths:

```mermaid
flowchart LR
    subgraph ServerGateway["API GATEWAY / CLIENT"]
        G1["HTTP POST Request to Port 8000"]
    end

    subgraph FastAPIRouter["FASTAPI AI HUB ROUTER (apps/ai-engine/app/main.py)"]
        G1 --> ROUTE{"Match Endpoint Path"}
        
        ROUTE -- "/ai/triage" --> E1["triage.py<br/>evaluate_sos_urgency()"]
        ROUTE -- "/ai/damage" --> E2["damage_assessment.py<br/>process_damage_photo()"]
        ROUTE -- "/ai/pfa" --> E3["pfa_chatbot.py<br/>PFAChatbotEngine.get_pfa_response()"]
        ROUTE -- "/ai/flood-map" --> E4["satellite_flood_mapping.py<br/>generate_satellite_flood_polygons()"]
        ROUTE -- "/ai/shelter/qr" --> E5["shelter_qr_checkin.py<br/>ShelterQRService.generate_family_qr_payload()"]
        ROUTE -- "/ai/shelter/checkin" --> E6["shelter_qr_checkin.py<br/>ShelterQRService.check_in_family()"]
        ROUTE -- "/ai/shelter/status" --> E7["shelter_qr_checkin.py<br/>ShelterQRService.get_shelter_status()"]
    end

    subgraph OutputJSON["STRUCTURED JSON RESPONSES"]
        E1 --> O1["Priority Score (1-100) & Urgency Level"]
        E2 --> O2["Anti-Fraud Status & SDRF Compensation"]
        E3 --> O3["Grounding Reply & Breathing Exercise"]
        E4 --> O4["GeoJSON Inundation Polygons"]
        E5 --> O5["Deterministic Family QR Payload"]
        E6 --> O6["Check-In Confirmation / Capacity Redirect"]
        E7 --> O7["Live Shelter Occupancy Percentage"]
    end
```

---

## 4. AI Crowdsourced Damage Assessment and Direct Benefit Transfer (DBT) Flow

This workflow verifies damaged building photo claims, enforces anti-fraud checks, grades structural damage using AI vision logic, and routes valid claims to the automated monetary payout pipeline.

```mermaid
flowchart TD
    subgraph OnDevice["ON-DEVICE (Mobile Client)"]
        D1["Citizen Captures Damage Photo"] --> D2["Extract Embedded EXIF Metadata (GPS & Timestamp)"]
        D2 --> D3["Submit Photo + Metadata + Claimed GPS"]
    end

    subgraph ServerSideAI["SERVER-SIDE (FastAPI AI Engine - /ai/damage)"]
        D3 --> S1["Ingest Metadata and Claimed GPS"]
        S1 --> S2{"Calculate GPS Delta<br/>(lat_diff < 0.01 & lng_diff < 0.01)"}
        
        S2 -- "Failed GPS Match" --> FLAG_FRAUD["Set Status: FLAGGED_FRAUD_RISK"]
        S2 -- "GPS Verified" --> S3["Compute pHash SHA-256 Photo Hash"]
        
        S3 --> S4{"Check Existing Hash Database<br/>Is Duplicate Photo?"}
        S4 -- "Yes (Duplicate)" --> FLAG_FRAUD
        S4 -- "No (Unique)" --> S5["ResNet50 Vision Damage Classifier"]
        
        S5 --> S6{"Classify Damage Grade"}
        S6 -- "Collapsed / Destroyed" --> G1["FULLY_DESTROYED<br/>Eligible: Rs 4,00,000"]
        S6 -- "Crack / Flood" --> G2["MAJOR_STRUCTURAL_DAMAGE<br/>Eligible: Rs 1,30,000"]
        S6 -- "Minor Damage" --> G3["MINOR_DAMAGE<br/>Eligible: Rs 25,000"]
        
        G1 --> RET_VAL["Return Anti-Fraud Status: VERIFIED_VALID"]
        G2 --> RET_VAL
        G3 --> RET_VAL
        FLAG_FRAUD --> RET_VAL
    end

    subgraph ServerSideDBT["SERVER-SIDE (API Gateway - /api/dbt/payout)"]
        RET_VAL --> DBT1["Ingest Damage Result + Aadhaar Number"]
        DBT1 --> DBT2{"Mock Aadhaar e-KYC Verification<br/>(Length == 12 Digits)"}
        
        DBT2 -- "Verified" --> P1["Status: APPROVED_ONE_CLICK_PAYOUT<br/>Generate Transaction ID"]
        DBT2 -- "Failed" --> P2["Status: HOLD_PENDING_DOCS<br/>Flag for Manual Review"]
        
        P1 --> AUDIT["Generate Digital Audit Trail"]
        P2 --> AUDIT
    end
```

---

## 5. On-Device Missing Persons Facial Matching Flow

Facial recognition is executed entirely on-device to allow family matching in offline rescue shelters without cloud dependency.

```mermaid
flowchart TD
    subgraph OnDeviceFace["ON-DEVICE (Mobile Client / Offline Shelter App)"]
        F1["Rescuer Takes Photo of Found Person"] --> F2["Generate 128-d Vector Embedding<br/>OnDeviceFaceMatching.generateFaceEmbedding()"]
        F2 --> F3["Load Local Offline Missing Persons DB"]
        F3 --> F4["Iterate DB Profiles & Compute Cosine Similarity<br/>calculateCosineSimilarity(vecA, vecB)"]
        
        F4 --> F5{"Find Highest Similarity Score<br/>Is Highest Score >= 0.85?"}
        
        F5 -- "Yes (Match Found)" --> M1["Display Match Alert!<br/>Person Name & Parent Contact Info"]
        F5 -- "No (No Match)" --> M2["Store Photo Vector in Local Offline DB"]
    end
```

---

## 6. Peer-to-Peer BLE Mesh Routing and Store-and-Forward Relay

When internet infrastructure fails, SOS packets travel hop-by-hop across nearby smartphones until an online peer is reached.

```mermaid
flowchart TD
    subgraph NodeA["OFFLINE VICTIM DEVICE A (No Cellular/Internet)"]
        N1["User Triggers SOS"] --> N2["Save to RxDB Local Storage<br/>sync_status: OFFLINE_BUFFERED"]
        N2 --> N3["Encrypt Payload via AES-256-CBC Noise Protocol"]
        N3 --> N4["Scan BLE Nearby Peers & Broadcast Packet"]
    end

    subgraph NodeB["OFFLINE VOLUNTEER DEVICE B (No Internet)"]
        N4 --> B1["Receive Encrypted BLE Packet"]
        B1 --> B2{"Check Local Mesh Routing Table<br/>Is Packet UUID Duplicate?"}
        B2 -- "Yes" --> B3["Ignore Duplicate Packet"]
        B2 -- "No" --> B4["Decrypt Packet & Increment Hop Count"]
        B4 --> B5{"Does Device B Have Internet?"}
        B5 -- "No Internet" --> B6["Store in Routing Table & Relay to Peers"]
    end

    subgraph NodeC["ONLINE PEER DEVICE C (Has Internet Connectivity)"]
        B6 --> C1["Device C Receives BLE Relay Packet"]
        C1 --> C2{"Does Device C Have Internet?"}
        C2 -- "Yes (Internet Active)" --> C3["Execute Gateway Relay Sync<br/>HTTP POST /api/sos Payload"]
        C3 --> C4["Mark RxDB Record: SYNCED_TO_CLOUD"]
    end
```

---

## 7. Disaster-Aware Dynamic Routing Flow (OSRM Polygon Avoidance)

The routing engine dynamically recalculates safe navigation routes around active flood zones or collapsed bridges.

```mermaid
flowchart TD
    subgraph ServerRouting["SERVER-SIDE ROUTING ENGINE (osrmRouting.js)"]
        R1["Ingest Active Hazard Polygons<br/>(e.g., Sector V Flooded Underpass)"] --> R2["Receive Route Request (Start, Target)"]
        R2 --> R3{"Execute Polygon Ray-Casting Test<br/>Does Direct Path Intersect Hazard Polygon?"}
        
        R3 -- "Yes (Path Intersects Hazard)" --> R4["Bypass Blocked Hazard Region<br/>Generate Waypoints via Outer Ring Road"]
        R3 -- "No (Path Clear)" --> R5["Generate Direct Waypoints Path"]
        
        R4 --> R6["Return Status: SAFE_ROUTE_GENERATED<br/>Include Bypass Waypoints & Avoided Hazards"]
        R5 --> R7["Return Status: DIRECT_ROUTE_CLEAR"]
    end
```

---

## 8. Dynamic QR Code Shelter Check-In and Capacity Management Flow

This process manages family shelter registrations and occupancy tracking using offline-generated QR codes.

```mermaid
flowchart TD
    subgraph ClientQR["ON-DEVICE (Citizen App)"]
        Q1["Input Family Head Name, Aadhaar Last4, Member Count, Medical Flags"] --> Q2["Generate Deterministic QR Payload & Hash<br/>ShelterQRService.generate_family_qr_payload()"]
        Q2 --> Q3["Display Dynamic QR Code on Client Screen"]
    end

    subgraph ShelterScanner["SHELTER ADMIN TABLET / APP"]
        Q3 --> S1["Scan Family QR Code at Shelter Entrance"]
        S1 --> S2["Submit HTTP POST /ai/shelter/checkin Request"]
    end

    subgraph ServerShelter["SERVER-SIDE (FastAPI / Gateway)"]
        S2 --> C1{"Check Target Shelter Capacity<br/>Is (Occupancy + Family Members) <= Capacity?"}
        
        C1 -- "Shelter Full" --> R1["Return Status: SHELTER_FULL<br/>Provide Alternative Shelter Redirect"]
        C1 -- "Capacity Available" --> C2{"Check Checked-In Registry<br/>Is QR Code ID Already Checked In?"}
        
        C2 -- "Already Checked In" --> R2["Return Status: ALREADY_CHECKED_IN"]
        C2 -- "New Check-In" --> C3["Increment Shelter Occupancy Count<br/>Add Family Record to Registry"]
        
        C3 --> R3["Return Status: CHECK_IN_SUCCESS<br/>Updated Occupancy Percentage"]
        R3 --> WS_BROADCAST["Broadcast Live Occupancy Update to ICS Dashboard"]
    end
```
