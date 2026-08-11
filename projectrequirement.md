# AapdaSetu Project Requirements and Scope Documentation

## 1. System Overview

AapdaSetu is a disaster management software system designed to maintain operational continuity during catastrophic events when central cellular and internet infrastructures collapse. The system combines an offline-first mobile client with a peer-to-peer (P2P) Bluetooth Low Energy (BLE) mesh network, a high-throughput Node.js API Gateway with an integrated Redis queue, a Python FastAPI artificial intelligence microservice engine, a disaster-aware Open Source Routing Machine (OSRM) navigation service, and a Web-based Multi-Agency Incident Command System (ICS) dashboard.

---

## 2. Master Feature Scope Matrix

The system comprises 20 core software features categorized by functional domains:

### 2.1 Core Emergency Operations

1. Peer-to-Peer Offline SOS Sync (Mesh Networking via BLE)
   - Store SOS packets locally when network connectivity is lost using RxDB offline storage.
   - Discover nearby peer devices via Bluetooth Low Energy (BLE) and Web Bluetooth APIs.
   - Encrypt SOS packets using AES-256-CBC Noise protocol symmetric encryption with a shared key (`AAPDASETU_BITCHAT_NOISE_KEY_2026`).
   - Store and forward encrypted packets across multi-hop peer nodes until an internet-connected device is reached, which relays the payload to the central API Gateway.

2. Explainable AI Triage and Priority Engine
   - Ingest incoming raw text transcripts and user demographic profiles.
   - Apply a weighted keyword scoring algorithm to evaluate life-threatening conditions (e.g., drowning: +30, trapped: +25, submerged: +25, roof: +20, water 5ft/6ft: +25/+30, bleeding: +25, diabetic: +15, heart condition: +20, pregnant: +25, infant: +20).
   - Apply demographic vulnerability boosts for elderly users (age >= 60) and young children (age <= 5) (+20 score boost), as well as pre-existing medical conditions (+15 score boost).
   - Score requests on a scale from 1 to 100 and categorize them into urgency tiers: CRITICAL_RED (score >= 80), HIGH_YELLOW (score >= 50), and NORMAL_GREEN (score < 50).

3. Voice-First NLP Interface for Zero-Literacy Users
   - Capture native spoken voice input in Indic languages (Hindi, English).
   - Transcribe voice audio into text strings (Speech-to-Text).
   - Perform natural language processing intent extraction to identify group size, flood depth, urgency flags, and emergency rescue requirements without requiring manual button navigation.

4. Disaster-Aware Dynamic Routing Engine (OSRM Polygon Avoidance)
   - Ingest crowdsourced and satellite-detected hazard polygons (flooded underpasses, collapsed bridges, inundation zones).
   - Calculate safe evacuation and rescue routes from origin to destination coordinates.
   - Automatically bypass active hazard polygons using ray-casting geometry algorithms and supply safe alternative waypoints (e.g., via Sector V Outer Ring Road).

5. Low-Bandwidth WebRTC Telemedicine
   - Establish low-bitrate WebRTC audio/video communication sessions between isolated victims and remote medical personnel.
   - Route patient sessions based on medical priority queues.

### 2.2 Identification and Relief Operations

6. On-Device Facial Matching for Missing Persons
   - Convert uploaded or captured photos into 128-dimensional mathematical vector embeddings.
   - Compute Cosine Similarity distance metrics locally on the device without requiring cloud connectivity.
   - Compare captured vectors against a local offline database of missing persons to detect matches (threshold >= 0.85).

7. Dynamic QR Code Shelter Check-In System
   - Generate encrypted dynamic family QR code payloads containing family head details, Aadhaar verification tokens, member count, and medical flags.
   - Allow shelter administrators to scan family QR codes to execute digital shelter check-in.
   - Enforce capacity tracking to prevent overcrowding and provide alternative shelter redirection when capacity is exceeded.

8. Multi-Channel Geofenced Early Warning System (EWS)
   - Ingest meteorological hazard warnings and target geographic polygons.
   - Identify active users located inside warning polygons using spatial PostGIS polygon queries.
   - Dispatch multi-channel early warning alerts across WebSockets, SMS, WhatsApp API, and automated IVR voice calls.

9. Crowdsourced AI Damage Assessment (Anti-Fraud Engine)
   - Ingest user-submitted photos of damaged infrastructure.
   - Extract EXIF metadata (GPS coordinates and timestamps) and compare against user-claimed submission location.
   - Compute Perceptual Hashes (pHash / SHA-256) to detect duplicate photo submissions across claims.
   - Classify structural damage severity into FULLY_DESTROYED, MAJOR_STRUCTURAL_DAMAGE, or MINOR_DAMAGE, and auto-calculate eligible SDRF/NDRF financial compensation.

10. Algorithmic Skill-Matching Rescuer Dispatch Engine
    - Maintain a registry of verified volunteers indexed by geographic coordinates and specialized skills (Doctor, Swimmer, Translator).
    - Match incoming SOS requests with the nearest available skill-matched rescuer.
    - Update rescuer status to DISPATCHED and track rescue progress in real time.

### 2.3 Psychological, Recovery, and Administrative Modules

11. AI-Powered Psychological First Aid (PFA) Chatbot
    - Provide automated conversational support to trapped or panicked victims.
    - Deliver step-by-step 4-second breathing exercises, 5-4-3-2-1 sensory grounding instructions, and panic reduction guidance.

12. Automated Direct Benefit Transfer (DBT) Pipeline
    - Link damage assessment records with victim profiles.
    - Perform Aadhaar mock e-KYC verification.
    - Auto-generate digital transaction audit trails and approve automated monetary disbursements based on SDRF/NDRF norms (Rs 4 Lakh for destroyed homes, Rs 1.3 Lakh for major structural damage, Rs 25,000 for minor damage).

13. Multi-Agency Unified Command System (ICS Dashboard)
    - Provide a centralized real-time web command map displaying incident locations, agency geofences (NDRF Sector A, Red Cross Sector B), active hazard polygons, shelter occupancies, and volunteer distributions.

14. Cryptographic Aid and Donation Tracker
    - Maintain an immutable SHA-256 hash-chain ledger tracking incoming financial donations down to physical supply procurement and shelter QR check-in distributions.

15. AI-Routed Grievance Redressal and Anti-Corruption Escalation
    - Ingest public grievances regarding relief material distribution or corruption.
    - Categorize complaint text using text classification logic and route to appropriate regulatory authorities with strict SLA escalation timers.

16. Satellite Imagery AI Flood Mapping
    - Process synthetic aperture radar (SAR Sentinel-1) satellite imagery metadata.
    - Generate real-time GeoJSON flood extent polygons indicating inundated regions, estimated water depth, and affected administrative sectors.

17. Digital Forensic Dead Body Management (DBM) Registry
    - Maintain a secure registry for victim identification using physical markers (tattoos, scars, clothing).
    - Perform similarity searches against missing persons records to assist forensic identification.

18. Accessibility and Sign Language Engine
    - Convert disaster text alerts into Indian Sign Language (ISL) 3D avatar animation gesture sequences for hearing-impaired citizens.

19. Animal and Livestock Rescue Parallel System
    - Maintain dedicated SOS tracking for trapped livestock and farm animals.
    - Aggregate animal hotspot coordinates to assist agricultural evacuation teams.

20. Crowdsourced Epidemic and WASH Surveillance Heatmap
    - Aggregate symptom reports submitted from emergency shelters (e.g., fever, diarrhea, vomiting).
    - Monitor disease threshold limits per shelter and issue automated Red Alert outbreak warnings when symptom counts exceed outbreak thresholds.

---

## 3. AI Models Included vs. Not Included Matrix

| Domain / Feature | Included Model / Algorithm in Codebase | Model Type / Runtime | Not Included / Production Target |
|---|---|---|---|
| SOS Urgency Triage | Weighted Keyword Engine & Demographic Vulnerability Scoring (`triage.py` & `server.js`) | Deterministic Weighted Rule Engine | Transformer BERT / RoBERTa Multilingual Classifier |
| Building Damage Assessment | Metadata GPS Delta Verification, pHash SHA-256 Hash Matching, Keyword Severity Classifier (`damage_assessment.py`) | Heuristic Computer Vision Interface | Deep ResNet50 / ConvNeXt Model trained on satellite and drone imagery |
| Voice NLP Interface | Speech Text Parser & Entity Extraction (`VoiceNLPService.js`) | Rule-based Intent Parser | Cloud OpenAI Whisper STT / Bhashini API instances |
| Psychological First Aid (PFA) | State-based Grounding & Survival Guidance Engine (`pfa_chatbot.py`) | Interactive Conversational Engine | Fine-tuned Llama-3 / GPT-4 LLM inference server |
| Satellite Flood Mapping | Synthetic Inundation GeoJSON Polygon Generator (`satellite_flood_mapping.py`) | Spatial GeoJSON Polygon Generator | Live Sentinel-1 SAR U-Net Image Segmentation Pipeline |
| On-Device Face Matching | 128-d Vector Embedding Generator & Cosine Similarity Distance Calculator (`OnDeviceFaceMatching.js`) | Mathematical Vector Similarity Engine | Full InsightFace / Face-API.js ONNX Runtime Deep Neural Network |
| Sign Language Translation | Text-to-ISL Token Parser (`SignLanguageEngine.js`) | Syntax Mapping Engine | WebGL 3D Avatar Rendering Engine |

---

## 4. Execution Boundaries: On-Device (Client Side) vs. Server Side

### 4.1 On-Device (Client Side / Offline Mobile & PWA)

The following components run locally on the user's mobile device or PWA browser engine:

1. RxDB Offline Local Storage (`RxDBOfflineStorage.js`)
   - Local buffering of unsent SOS requests in IndexedDB/Map storage when offline.
2. BitChat P2P BLE Mesh Protocol Engine (`BitChatMeshEngine.js`)
   - Peer device discovery via Bluetooth Low Energy (BLE).
   - Symmetric Noise-protocol AES-256-CBC encryption of SOS packets.
   - Multi-hop store-and-forward routing across offline peers.
3. On-Device Facial Matching (`OnDeviceFaceMatching.js`)
   - Local generation of 128-d face embeddings.
   - Computation of Cosine Similarity matching against locally stored missing person profiles without internet.
4. Voice Audio Capture & NLP Processing (`VoiceNLPService.js`)
   - Local speech transcription and emergency intent extraction.
5. Family QR Code Generation (`ShelterQRService.js` / Client JS)
   - Client-side SHA-256 generation of deterministic family QR payloads.
6. Sign Language Avatar Gesture Translation (`SignLanguageEngine.js`)
   - Text parsing and mapping of alert text to ISL gesture sequences on client displays.

### 4.2 Server Side (Node.js API Gateway, FastAPI AI Engine, OSRM Microservice)

The following components run on central server infrastructure:

1. Express Node.js API Gateway (`server.js`)
   - Ingestion point for incoming HTTP POST /api/sos requests.
   - IP-based Rate Limiter (1 SOS per IP window) and Redis Queue ingestion (`redisQueue`).
   - In-memory database persistence (`database.set(sos_uuid, record)`).
   - Real-time WebSocket broadcasting server (`wss.clients.forEach`) to command centers.
2. Python FastAPI AI Engine (`apps/ai-engine/app/main.py`)
   - High-priority SOS urgency triage evaluation (`/ai/triage`).
   - Anti-fraud photo damage assessment and compensation calculation (`/ai/damage`).
   - Psychological First Aid chatbot responses (`/ai/pfa`).
   - Satellite flood mapping GeoJSON polygon generation (`/ai/flood-map`).
   - Shelter digital registry state and QR check-in validation (`/ai/shelter/checkin`).
3. Disaster-Aware OSRM Routing Engine (`osrmRouting.js`)
   - Maintenance of active hazard polygons.
   - Route calculation avoiding hazard polygons using spatial geometry.
4. Administrative Microservices (`apps/api-gateway/src/services/`)
   - Direct Benefit Transfer compensation processing (`dbtPipeline.js`).
   - Cryptographic SHA-256 hash-chain ledger maintenance (`cryptographicLedger.js`).
   - Multi-channel geofenced early warning broadcast (`ewsAlertService.js`).
   - Telemedicine low-bandwidth WebRTC queue management (`telemedicineService.js`).
   - Grievance registration and SLA timer tracking (`grievanceEscalation.js`).
   - Digital Dead Body Management forensic registry (`forensicDBMRegistry.js`).
   - Livestock emergency tracking (`livestockRescueService.js`).
   - Epidemic symptom tracking and shelter outbreak alerts (`epidemicSurveillance.js`).
5. Multi-Agency Command Dashboard UI (`apps/web-dashboard/index.html`)
   - GIS Leaflet.js visualization of real-time SOS incidents, agency sectors, flood polygons, shelters, and volunteers.

---

## 5. Endpoints Reference Matrix

### 5.1 API Gateway REST Routes (`apps/api-gateway/src/server.js`)

| HTTP Method | Route | Description | Backend Service File |
|---|---|---|---|
| POST | `/api/sos` | Ingests SOS packet, applies IP rate limiter, checks UUID deduplication, queues in Redis, scores triage, and broadcasts via WebSocket. | `server.js` |
| GET | `/api/sos` | Retrieves all ingested SOS records. | `server.js` |
| POST | `/api/voice/process` | Processes spoken text and extracts emergency intent. | `VoiceNLPService.js` |
| POST | `/api/routing/safe-path` | Calculates safe evacuation route avoiding hazard polygons. | `osrmRouting.js` |
| POST | `/api/telemedicine/session` | Creates low-bandwidth telemedicine call session. | `telemedicineService.js` |
| POST | `/api/face/match` | Runs facial matching query against local missing persons database. | `OnDeviceFaceMatching.js` |
| POST | `/api/ews/alert` | Broadcasts geofenced early warning alert across multiple channels. | `ewsAlertService.js` |
| POST | `/api/volunteer/dispatch` | Matches and dispatches available skill-matched rescuer to SOS. | `server.js` |
| POST | `/api/dbt/payout` | Processes Direct Benefit Transfer compensation and audit trail. | `dbtPipeline.js` |
| POST | `/api/ledger/donation` | Mines new donation block in cryptographic SHA-256 ledger. | `cryptographicLedger.js` |
| POST | `/api/grievance` | Registers corruption/relief grievance and sets SLA timer. | `grievanceEscalation.js` |
| POST | `/api/forensic/dbm` | Logs unidentified deceased body record in DBM registry. | `forensicDBMRegistry.js` |
| POST | `/api/livestock` | Reports trapped livestock coordinates for veterinary dispatch. | `livestockRescueService.js` |
| POST | `/api/epidemic/report` | Logs shelter symptom report and monitors outbreak threshold. | `epidemicSurveillance.js` |

### 5.2 FastAPI AI Engine Routes (`apps/ai-engine/app/main.py`)

| Endpoint | Target Function | Description |
|---|---|---|
| `/ai/triage` | `evaluate_sos_urgency()` | Evaluates transcript text and victim demographics; returns priority score (1-100) and urgency level. |
| `/ai/damage` | `process_damage_photo()` | Validates photo EXIF GPS, checks pHash duplicates, grades structural damage, and computes compensation. |
| `/ai/pfa` | `PFAChatbotEngine.get_pfa_response()` | Generates grounding conversation, breathing exercise instructions, and safety checklists. |
| `/ai/flood-map` | `generate_satellite_flood_polygons()` | Generates Sentinel-1 SAR synthetic flood inundation GeoJSON polygons. |
| `/ai/shelter/qr` | `ShelterQRService.generate_family_qr_payload()` | Generates deterministic family QR code payload with Aadhaar last 4 and medical flags. |
| `/ai/shelter/checkin` | `ShelterQRService.check_in_family()` | Validates shelter capacity, prevents duplicate check-ins, updates occupancy, or triggers shelter redirect. |
| `/ai/shelter/status` | `ShelterQRService.get_shelter_status()` | Returns live occupancy percentage and checked-in family counts for all active shelters. |
