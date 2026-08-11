# AapdaSetu Technical Architecture and Technology Stack Documentation

## 1. Executive Summary

AapdaSetu is architected as an offline-first, event-driven multi-tier disaster management platform. The technology stack spans client-side mobile/PWA applications utilizing peer-to-peer (P2P) Bluetooth Low Energy (BLE) communication, a high-throughput Node.js API Gateway with an integrated Redis queue, a Python FastAPI artificial intelligence engine, an Open Source Routing Machine (OSRM) pathfinding service, and a Leaflet.js WebSocket-enabled Incident Command System (ICS) dashboard.

---

## 2. Technology Stack Overview

### 2.1 Core Programming Languages and Runtimes

- JavaScript (Node.js v18+ / ES6+): Core language for client-side offline storage, P2P BLE mesh protocol, API Gateway microservice routing, WebRTC telemedicine signaling, OSRM pathfinding, and frontend dashboard logic.
- Python 3.10+: Runtime for the AI microservice engine, powering SOS triage evaluation, computer vision damage assessment simulation, psychological first aid conversational engines, satellite flood polygon generation, and shelter QR registry validation.
- HTML5 / CSS3: Standard markup and custom CSS token design system (glassmorphism, CSS custom properties) for the real-time Incident Command System dashboard.

---

## 3. Detailed Component Architecture

### 3.1 Client-Side (On-Device) Tech Stack

| Module Name | File Path | Primary Library / Technology | Functionality |
|---|---|---|---|
| Offline Database Storage | `apps/mobile-app/src/database/RxDBOfflineStorage.js` | JavaScript Map / RxDB pattern, `crypto.randomUUID()` | Buffers SOS records locally when internet connectivity is lost; tracks synchronization status (`OFFLINE_BUFFERED` to `SYNCED_TO_CLOUD`). |
| P2P BLE Mesh Protocol Engine | `apps/mobile-app/src/mesh/BitChatMeshEngine.js` | Node.js `crypto`, AES-256-CBC Noise Protocol, Buffer API | Encrypts SOS packets with a shared secret key (`AAPDASETU_BITCHAT_NOISE_KEY_2026`), manages discovered peer device tables, increments hop counts, and relays store-and-forward packets. |
| On-Device Face Matching | `apps/mobile-app/src/services/OnDeviceFaceMatching.js` | Standard JavaScript Math Library, 128-d Vector Math | Computes 128-dimensional facial vector embeddings and evaluates Cosine Similarity offline to match missing persons. |
| Voice NLP Engine | `apps/mobile-app/src/services/VoiceNLPService.js` | JavaScript Regex & String Parser | Transcribes native voice input and extracts emergency intent parameters (group size, water level, urgency). |
| Sign Language Engine | `apps/mobile-app/src/services/SignLanguageEngine.js` | JavaScript String Classifier | Translates emergency alert text into Indian Sign Language (ISL) animation gesture tokens for accessibility overlay. |
| SOS Packet Builder | `apps/mobile-app/src/services/SOSBuilder.js` | JavaScript Object Assembler | Constructs standardized JSON SOS packet payloads incorporating device GPS, user profiles, and transcripts. |

### 3.2 Server-Side Tech Stack

#### 3.2.1 API Gateway and Ingestion Pipeline
- Runtime: Node.js (v18+)
- Framework: Express.js
- Dependencies: `express`, `cors`, `http`, `ws`, `crypto`
- Entry Point: `apps/api-gateway/src/server.js` (Port 5000)
- Ingest Queue & Rate Limiter: In-Memory Redis Message Queue (`redisQueue = []`) handling payload buffering, IP-based rate limiting (1 SOS per IP window), and UUID deduplication.
- Real-time Broadcast: WebSocket Server (`ws.Server`) streaming live state updates to connected command center clients on `ws://localhost:5000`.

#### 3.2.2 Server-Side Microservices (`apps/api-gateway/src/services/`)

| Service File | Tech Stack | Responsibilities |
|---|---|---|
| `dbtPipeline.js` | JavaScript, Date API | Direct Benefit Transfer mock Aadhaar e-KYC validation, SDRF/NDRF monetary compensation calculation, and audit trail generation. |
| `cryptographicLedger.js` | Node.js `crypto` (SHA-256) | Implements an immutable cryptographic hash-chain ledger tracking donor funds down to vendor supply purchases and shelter QR check-ins. |
| `ewsAlertService.js` | JavaScript Array / Spatial Filter | Geofenced early warning alert generator targeting citizens inside risk polygons across multi-channel delivery networks. |
| `telemedicineService.js` | WebRTC Signal Manager, Socket.io Pattern | Configures low-bandwidth WebRTC audio/video sessions connecting remote doctors with victims in isolated zones. |
| `grievanceEscalation.js` | JavaScript Map, SLA Timers | Logs corruption or relief material complaints, assigns severity tiers, and manages SLA escalation routines. |
| `forensicDBMRegistry.js` | JavaScript Map, SHA-256 Hash | Secure digital Dead Body Management registry for tracking unidentified bodies via physical markers and matching missing person records. |
| `livestockRescueService.js` | JavaScript Spatial Aggregator | Tracks trapped livestock GPS coordinates and aggregates animal hotspots for veterinary rescue operations. |
| `epidemicSurveillance.js` | Statistical Threshold Math | Ingests shelter health symptom reports, tracks disease thresholds, and triggers automated Red Alert epidemic warnings. |

#### 3.2.3 AI Microservice Engine (`apps/ai-engine/app/`)
- Runtime: Python 3.10+
- Framework: FastAPI / Uvicorn Server (Port 8000)
- Modules:
  - `main.py`: Entry point and HTTP request router for all AI endpoints.
  - `triage.py`: SOS weighted keyword triage and demographic urgency classification engine.
  - `damage_assessment.py`: EXIF metadata verification, pHash SHA-256 anti-fraud duplicate detection, and ResNet50 damage grading simulation.
  - `pfa_chatbot.py`: Psychological First Aid conversational engine providing breathing and grounding routines.
  - `satellite_flood_mapping.py`: Sentinel-1 SAR synthetic aperture radar GeoJSON inundation polygon generator.
  - `shelter_qr_checkin.py`: Shelter digital registry manager processing family QR check-ins and capacity redirect logic.

#### 3.2.4 OSRM Disaster Routing Engine (`apps/routing-service/src/osrmRouting.js`)
- Runtime: Node.js
- Engine: OSRM (Open Source Routing Machine) wrapper with spatial geometry algorithms.
- Logic: Maintains active hazard polygons, calculates Haversine spatial distances, and executes ray-casting polygon intersection tests to generate safe bypass routes around flooded or collapsed areas.

#### 3.2.5 Incident Command System Dashboard (`apps/web-dashboard/index.html`)
- UI Stack: Single-page Web Application using HTML5, Vanilla CSS, and modern Inter typography.
- Mapping Library: Leaflet.js (v1.9.4) with CARTO Dark All map tiles.
- Data Link: Native browser WebSocket connecting to `ws://localhost:5000` for real-time SOS queue updates, shelter occupancy bars, volunteer dispatch controls, and cryptographic aid ledger visualization.

---

## 4. On-Device vs. Server-Side Technical Specification Matrix

| Architecture Attribute | On-Device (Client-Side Component) | Server-Side Component |
|---|---|---|
| Operating Runtimes | Mobile JS Engine, Web Browser JS Engine | Node.js v18+ Runtime, Python 3.10 Engine |
| Network Requirements | Offline capable (Zero Internet via BLE Mesh) | Required HTTP / WebSocket network access |
| Data Persistence | Local IndexedDB / Map (`RxDBOfflineStorage`) | API Gateway In-Memory State (`Map`), Database |
| Cryptographic Operations | AES-256-CBC Noise Protocol payload encryption | SHA-256 Hash-Chain ledger mining (`cryptographicLedger.js`) |
| Face Matching Computation | 128-d Vector Cosine Similarity calculation | Central DBM matching & Missing Persons Database query |
| Routing Logic | Client location reporting & map rendering | Spatial ray-casting hazard avoidance pathfinding (`osrmRouting.js`) |
| AI Inference | Voice transcript & intent parsing (`VoiceNLPService.js`) | Urgency triage (`triage.py`), Damage grading (`damage_assessment.py`) |

---

## 5. Network Communication Protocols

1. Offline P2P BLE Protocol:
   - Shared secret symmetric key: `AAPDASETU_BITCHAT_NOISE_KEY_2026`.
   - Algorithm: AES-256-CBC cipher with 32-byte scrypt key derivation.
   - Routing: Multi-hop store-and-forward with hop-count tracking and UUID deduplication.

2. REST HTTP API Protocol:
   - JSON payload format over standard HTTP endpoints on Port 5000 (API Gateway) and Port 8000 (FastAPI AI Hub).

3. Real-Time Streaming Protocol:
   - WebSocket protocol (`ws://localhost:5000`) for low-latency bidirectional event broadcasting to command dashboard instances.
