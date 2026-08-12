# 🛠️ AapdaSetu Technical Architecture and Stack Documentation

## 1. Executive Technical Summary

**AapdaSetu** is architected as a hybrid, multi-stack disaster management platform designed for resilience, real-time event synchronization, and zero-friction citizen accessibility.

The ecosystem integrates three major technological layers:
1. **Next.js & Supabase Engine (`SOS-project with bolt/project`)**: Production Command Center built on Next.js 13 App Router, TypeScript, Tailwind CSS, shadcn/ui, and Supabase PostgreSQL with WebSocket subscriptions.
2. **React Web Client (`frontend-AapdaSetu`)**: Vite-powered Single Page Application (SPA) leveraging React 19, Leaflet.js interactive GIS mapping, and Framer Motion micro-animations.
3. **Python AI Engine (`apps/ai-engine`)**: FastAPI microservice providing explainable SOS triage scoring, anti-fraud photo damage assessment, SAR satellite flood polygon mapping, and PFA chatbot grounding.

---

## 2. Technology Stack Overview

### 2.1 Command Center & Platform Stack (`SOS-project with bolt/project`)
- **Framework:** [Next.js 13](https://nextjs.org/) (App Router, Server & Client Components)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling:** [Tailwind CSS 3.4](https://tailwindcss.com/) with custom design tokens, dark mode theme variables, and CSS animations.
- **UI Component Library:** [shadcn/ui](https://ui.shadcn.com/) built on top of [Radix UI](https://www.radix-ui.com/) primitives (Dialog, Dropdown, Tabs, Toast, Select, Switch).
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database & Realtime:** [Supabase](https://supabase.com/) (PostgreSQL 15, Row Level Security, Realtime WebSockets `postgres_changes`, RPC Security Definer functions).
- **Data Visualization:** [Recharts](https://recharts.org/) (AreaChart, BarChart, PieChart, ResponsiveContainer).
- **Internationalization (i18n):** Custom React Context (`lib/i18n/context.tsx`) with dictionaries for English (`en`), Hindi (`hi`), and Odia (`or`).

### 2.2 React Web Client Stack (`frontend-AapdaSetu`)
- **Client Framework:** React 19 & Vite 8 SPA.
- **GIS Mapping:** Leaflet.js 1.9 & CARTO / OpenStreetMap tile layers.
- **Animations:** Framer Motion 11.
- **Client Routing:** React Router v6 nested routes (`/dashboard`, `/emergency-sos`, `/disaster-alerts`, `/safe-routes`, `/medical-assistance`, `/report-damage`, `/missing-persons`, `/admin/dashboard`, `/volunteer/dashboard`).
- **Validation:** Zod 3.23 schema validation.

### 2.3 Python AI Engine Tech Stack (`apps/ai-engine/app/`)
- **Runtime:** Python 3.10+ & FastAPI microservice framework.
- **Triage Engine (`triage.py`):** Weighted keyword scanner and demographic vulnerability scoring algorithm.
- **Damage Assessment (`damage_assessment.py`):** EXIF geotag verification, perceptual hashing (pHash SHA-256) duplicate detection, and SDRF compensation calculation.
- **PFA Chatbot (`pfa_chatbot.py`):** Conversational AI engine for guided 4-second box breathing and 5-4-3-2-1 sensory grounding.
- **Satellite SAR Mapping (`satellite_flood_mapping.py`):** Sentinel-1 radar backscatter thresholding generating GeoJSON flood extent polygons.

---

## 3. Database Architecture & Schema Specification

The database runs on Supabase PostgreSQL with 8 core tables:

### 3.1 `reports` Table
- `id` (uuid, PK)
- `type` (text: fire, flood, medical, missing_person, earthquake, accident, other)
- `status` (text: pending, in_progress, resolved)
- `priority_score` (integer: 1 to 100)
- `priority_label` (text: RED, YELLOW, GREEN)
- `latitude` / `longitude` (float8)
- `landmark` / `description` (text)
- `reporter_name` / `reporter_phone` (text)
- `missing_person_name` / `missing_person_age` / `missing_person_desc` (text/integer)
- `medical_condition` / `blood_type` (text)
- `media_data` (text: base64 payload) / `media_type` (text: video, audio, none)
- `triage_factors` (jsonb: breakdown array of scoring factors)
- `assigned_volunteer_id` (uuid, FK -> volunteers.id)
- `assigned_agency_id` (uuid, FK -> agencies.id)
- `resolution_notes` (text)
- `created_at` / `updated_at` (timestamptz)

### 3.2 `volunteers` Table
- `id` (uuid, PK)
- `name` / `phone` (text)
- `skills` (text_array: medical, search_rescue, driving, logistics)
- `latitude` / `longitude` (float8)
- `status` (text: available, on_duty, offline)
- `assigned_report_id` (uuid, FK -> reports.id)

### 3.3 `shelters` Table
- `id` (uuid, PK)
- `name` / `address` (text)
- `latitude` / `longitude` (float8)
- `capacity` / `occupancy` (integer)
- `facilities` (text_array: food, water, medical_station, power_generator)
- `contact_phone` / `status` (text: open, full, closed)

### 3.4 `agencies` Table
- `id` (uuid, PK)
- `name` / `type` (text: fire_department, police, ndrf, hospital, ngo)
- `contact_phone` / `contact_email` / `jurisdiction` (text)
- `latitude` / `longitude` (float8)

### 3.5 `resources` Table
- `id` (uuid, PK)
- `name` / `category` (text: food, water, medical, clothing, fuel)
- `quantity` (integer) / `unit` (text)
- `shelter_id` (uuid, FK -> shelters.id)

### 3.6 `alerts` Table
- `id` (uuid, PK)
- `title` / `message` (text)
- `severity` (text: info, warning, critical)
- `channel` (text: sms, whatsapp, public, all)
- `target_area` / `created_by` (text)

### 3.7 `audit_logs` Table
- `id` (uuid, PK)
- `admin_email` / `action` / `entity_type` / `entity_id` (text)
- `details` (jsonb)
- `created_at` (timestamptz)

### 3.8 `safety_checkins` Table
- `id` (uuid, PK)
- `full_name` / `phone` / `location_name` / `notes` (text)
- `status` (text: safe, need_assistance)
- `latitude` / `longitude` (float8)
- `created_at` (timestamptz)

---

## 4. Automated AI Triage Scoring Algorithm

The triage calculation engine computes priority scores ranging from **1 to 100**:

```typescript
// Core Triage Logic (lib/triage.ts)
export function computeTriage(input: ReportInput): TriageResult {
  let score = 30; // Base Score
  
  // 1. Emergency Type Weighting
  score += TYPE_BASE_SCORES[input.type] || 5;
  
  // 2. Multi-Keyword NLP Match
  for (const [keyword, points] of Object.entries(KEYWORD_SCORES)) {
    if (textParts.includes(keyword)) score += points;
  }
  
  // 3. Demographics & Vulnerability Boost
  if (input.missing_person_age <= 12) score += 25;
  else if (input.missing_person_age >= 65) score += 20;
  
  // 4. Medical Condition Boosts
  if (condition.includes('pregnant')) score += 30;
  if (condition.includes('bleed')) score += 25;
  if (condition.includes('heart') || condition.includes('cardiac')) score += 20;
  
  // Clamp Score & Tag Label
  score = Math.max(1, Math.min(100, score));
  const label = score >= 80 ? 'RED' : score >= 50 ? 'YELLOW' : 'GREEN';
  
  return { score, label, factors };
}
```

---

## 5. Zero User-Side Authentication & RPC Security Definer

- **Public Access:** Citizens access emergency forms, tracking, shelter locators, and PFA chatbots without any login tokens.
- **Admin RPC Auth:** Admin Command Center authentication invokes a custom Supabase PostgreSQL RPC function:
  ```sql
  CREATE OR REPLACE FUNCTION verify_admin_login(p_email text, p_password text)
  RETURNS TABLE (id uuid, email text, name text)
  SECURITY DEFINER
  ...
  ```
- **Session Handling:** Admin sessions are persisted locally in `localStorage` under key `'aapdasetu_admin_session'`.

---

## 6. Execution Commands

```bash
# 1. Run Command Center Platform (SOS-project with bolt)
cd "SOS-project with bolt/project"
npm install
npm run dev

# 2. Run React Web Application (SIH-DM/frontend-AapdaSetu)
cd SIH-DM/frontend-AapdaSetu
npm install
npm run dev

# 3. Run Python AI Microservice Engine (SIH-DM/apps/ai-engine)
cd SIH-DM/apps/ai-engine
python app/main.py
```
