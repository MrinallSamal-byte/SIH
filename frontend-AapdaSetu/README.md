# 📱 AapdaSetu Web Client (`frontend-AapdaSetu`)

> **React 19 + Vite Disaster Management Web Interface**  
> *Low-latency, zero-authentication public web portal featuring Leaflet.js GIS navigation, emergency SOS intake, and real-time disaster alerts.*

---

## 📌 Features & Page Routes

The web client provides interactive tools accessible to citizens, emergency command operators, and relief volunteers:

| Route Path | Feature Module | Description |
| :--- | :--- | :--- |
| `/emergency-sos` | **Emergency SOS Hub** | Rapid emergency intake with location tagging, transcript recording, and demographic triage scoring. |
| `/disaster-alerts` | **Early Warnings** | Real-time aggregation of meteorological hazard alerts, cyclone monitoring, and risk polygons. |
| `/safe-routes` | **Safe Evacuation Navigation** | Interactive Leaflet.js GIS map rendering active flood polygons and calculating safe bypass routes. |
| `/medical-assistance` | **Telemedicine Queue** | Low-bandwidth medical consultation queue and doctor helpline directory. |
| `/report-damage` | **Damage Assessment** | Crowdsourced anti-fraud property damage photo upload with EXIF location verification. |
| `/missing-persons` | **Missing Persons Registry** | Public registry matching missing person reports with unidentified victim records. |
| `/admin/dashboard` | **Incident Command System** | Leaflet.js GIS command room rendering incident heatmaps, shelter occupancies, and volunteer distributions. |
| `/volunteer/dashboard` | **Volunteer Dispatch** | Skill-matched dispatch portal connecting verified volunteers (Doctors, Swimmers, Translators) with nearest emergencies. |

---

## 🛠️ Technology Stack

- **Framework:** React 19 & Vite 8 SPA.
- **Styling:** Tailwind CSS 3.4 & PostCSS with modern glassmorphism design system.
- **Animations:** Framer Motion 11 micro-animations.
- **GIS Mapping:** Leaflet.js 1.9 with OpenStreetMap & CARTO tile providers.
- **Routing:** React Router v6 nested client routes.
- **Form Validation:** Zod 3.23 schema validation.

---

## 📂 Directory Structure

```
frontend-AapdaSetu/
├── src/
│   ├── components/            # UI components (Navbar, Footer, Sidebar, Modals)
│   ├── context/               # Global state contexts
│   ├── hooks/                 # Custom React hooks
│   ├── layouts/               # Citizen, Admin, & Volunteer layout wrappers
│   ├── pages/                 # Feature pages (Citizen, Admin, Volunteer, Landing)
│   ├── routes/                # React Router switchboard definitions
│   ├── services/              # API clients connecting to Python AI Engine
│   ├── styles/                # Global CSS rules
│   ├── utils/                 # Spatial math & helper functions
│   ├── App.jsx                # Top-level application component
│   └── main.jsx               # Application entry point
├── package.json
└── vite.config.js
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18.0.0 or higher
- npm v9.0.0 or higher

### Installation & Execution

```bash
# 1. Navigate to the project directory
cd frontend-AapdaSetu

# 2. Install dependencies
npm install

# 3. Start development server with HMR
npm run dev

# The app will be available at http://localhost:5173
```

### Building for Production

```bash
# Generate optimized production bundle in dist/
npm run build

# Preview production build locally
npm run preview
```
