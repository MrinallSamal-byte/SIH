# 📜 AapdaSetu Master System Requirements & Feature Scope Specification

## 1. System Overview

**AapdaSetu (आपदासेतु / આપદાસેતુ)** is a comprehensive disaster management and emergency response ecosystem combining a Next.js / React Web Application (`SOS-project with bolt` & `frontend-AapdaSetu`) with a Python FastAPI AI Microservice Engine (`apps/ai-engine`).

The system delivers real-time emergency response, AI-driven priority triage, disaster-aware dynamic routing, psychological first aid support, anti-fraud property damage assessment, satellite flood mapping, and multi-agency incident command.

----

## 2. Master Feature Scope Matrix

### 2.1 Citizen Public Interface Features

1. **🚨 1-Tap SOS Emergency Button:**
   - Single-click emergency trigger.
   - Zero multi-step forms or mandatory login.
   - Automatic geolocation capture using HTML5 Browser Geolocation API (`navigator.geolocation`).
   - Generates an immediate `RED` priority dispatch tag.

2. **📝 Intelligent Incident Report Form (`report-form.tsx`):**
   - Multi-step form support for 7 incident types: `fire`, `flood`, `medical`, `missing_person`, `earthquake`, `accident`, `other`.
   - Captures reporter details, landmark text, victim demographic profile (age, group size), medical flags (pregnancy, cardiac, bleeding), missing person descriptors, and audio/video media uploads (base64 payload).

3. **🔍 Incident Tracking ID Lookup (`report-tracker.tsx`):**
   - Real-time status lookup using emergency incident tracking IDs.
   - Displays status timeline (`pending` ➔ `in_progress` ➔ `resolved`), assigned volunteer/agency, and resolution notes.

4. **🧠 Explainable AI SOS Urgency Triage (`lib/triage.ts` & `apps/ai-engine/app/triage.py`):**
   - Base priority score initialization (30 points).
   - Emergency type base weighting (+25 for earthquake, +20 for fire, +15 for flood/medical/missing, +12 for accident).
   - NLP Multi-keyword scoring (+30 for `drowning`, `trapped`, `pregnant`; +25 for `bleeding`, `infant`, `cardiac`, `submerged`; +20 for `water 5ft`, `child`, `unconscious`; +15 for `roof`, `diabetic`, `elderly`).
   - Demographic vulnerability boosts for children (age <= 12 or <= 5) (+20 to +25 points) and elderly (age >= 60 or >= 65) (+20 points).
   - Dynamic classification into `RED` (score >= 80), `YELLOW` (score >= 50), and `GREEN` (score < 50).

5. **✅ Safety Status Check-ins (`safety-checkin.tsx`):**
   - Allows citizens in disaster zones to check in as "Safe" or "Need Assistance".
   - Persists records into the `safety_checkins` table for family tracking and responder verification.

6. **🏠 Nearby Shelter Finder (`shelter-finder.tsx`):**
   - Interactive shelter locator calculating exact spatial distance in kilometers using the Haversine formula.
   - Displays shelter operational status (`open`, `full`, `closed`), capacity bars, amenities (food, water, medical, power), contact details, and navigation links.

7. **📢 Live Public Warning Alerts (`public-alerts.tsx`):**
   - Real-time emergency broadcast banners pushed via Supabase Realtime subscriptions.
   - Displays alert severity levels (`info`, `warning`, `critical`) and target geographic regions.

8. **🌐 Multi-lingual Engine (`language-switcher.tsx`):**
   - Instant language switching across **English**, **Hindi (हिंदी)**, and **Odia (ଓଡ଼િઆ)** without page reloads.

9. **🤖 Psychological First Aid Chatbot (`apps/ai-engine/app/pfa_chatbot.py`):**
   - Conversational AI support for panicked victims.
   - Delivers guided 4-second box breathing exercises and 5-4-3-2-1 sensory grounding techniques.

10. **Crowdsourced Anti-Fraud Damage Assessment (`apps/ai-engine/app/damage_assessment.py`):**
    - Property damage photo evidence submission.
    - EXIF location validation, perceptual hash (pHash SHA-256) duplicate detection, structural damage grading (`FULLY_DESTROYED`, `MAJOR_STRUCTURAL_DAMAGE`, `MINOR_DAMAGE`), and automated SDRF compensation calculation.

11. **Satellite SAR AI Flood Mapping (`apps/ai-engine/app/satellite_flood_mapping.py`):**
    - Sentinel-1 Synthetic Aperture Radar (SAR) metadata processing.
    - Real-time GeoJSON flood extent polygon generation for GIS map layering.

12. **Low-Bandwidth WebRTC Telemedicine (`/medical-assistance`):**
    - Emergency doctor consultation queue and low-bitrate consultation links.

13. **Missing Persons & Forensic Registry (`/missing-persons`):**
    - Public registry matching missing person reports with unidentified victim records.

14. **Disaster-Aware Dynamic Navigation (`/safe-routes`):**
    - Leaflet.js GIS map displaying active flood polygons, blocked underpasses, and safe rerouting paths.

---

### 2.2 Admin Command Center Subsystems (11 Modular Views)

1. **📊 Overview & Key Performance Gauge (`overview.tsx`):** High-level KPI cards displaying total reports, active RED alerts, open shelters, available volunteers, and response times.
2. **📡 Live SOS Realtime Stream (`live-sos.tsx`):** Real-time WebSocket stream of incoming emergency reports with automatic audio sound alarms triggered on `RED` priority alerts.
3. **📋 Incident Reports Management (`reports.tsx`):** Search, filter, and triage view for managing incident statuses (`pending`, `in_progress`, `resolved`) and opening detail modals.
4. **🔍 Missing Persons Registry (`missing-persons.tsx`):** Case management portal for missing person reports and match tracking.
5. **👷 Volunteer Roster & Skill Dispatch (`volunteers.tsx`):** Real-time roster tracking volunteer skills (`medical`, `search_rescue`, `driving`, `logistics`) and dispatch statuses (`available`, `on_duty`, `offline`).
6. **🏠 Relief Shelters & Capacity Management (`shelters.tsx`):** Operational control panel for monitoring shelter capacities, updating occupancy numbers, and managing facility supplies.
7. **🏢 Multi-Agency Response Roster (`agencies.tsx`):** Roster of relief agencies (NDRF, Fire, Police, Hospitals, NGOs) with contact info and jurisdictions.
8. **📢 Multi-Channel Alert Broadcaster (`communications.tsx`):** Emergency warning push tool for broadcasting alerts across SMS, WhatsApp, and public web channels.
9. **📈 Crisis Analytics Visualizer (`analytics.tsx`):** Interactive chart dashboard powered by Recharts showing incident category trends, response timelines, and geographic distribution.
10. **📜 Compliance & Security Audit Logs (`audit.tsx`):** Read-only audit log tracking every administrative action, status change, and login event.
11. **⚙️ System Settings & API Integrations (`settings.tsx`):** Administrative portal for managing system configurations, API credentials, and default thresholds.

---

## 3. Zero User-Side Authentication Policy

To guarantee zero friction during life-threatening emergencies:
- **No registration, login, or password is required** for citizens or victims.
- All public citizen tools (1-Tap SOS, Report Form, Safety Check-in, Shelter Finder, PFA Chatbot, Safe Routes, Damage Reporting) are instantly accessible out-of-the-box.
- Administrative Command Center access is gated behind secure Supabase RPC authentication (`verify_admin_login()`).

---

## 4. Security & Technical Architecture Requirements

- **Database Security:** PostgreSQL Row Level Security (RLS) policies for read/write access.
- **Authentication:** Custom security definer RPC function (`verify_admin_login`) using `pgcrypto` password hashing.
- **Realtime Transport:** Supabase WebSocket channels (`postgres_changes`) for low-latency live dispatch push.
- **Microservice Integration:** REST API integration between the web application client and the Python FastAPI AI engine.
