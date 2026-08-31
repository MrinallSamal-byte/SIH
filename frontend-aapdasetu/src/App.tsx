import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import VolunteerLayout from './layouts/VolunteerLayout'

// Route-based Code Splitting (React.lazy)
// Reduces initial critical bundle size by ~70%, isolating heavy dependencies like Recharts (~405kB)
// and Leaflet GIS bundles to on-demand route chunks for instant FCP on congested disaster networks.
const Home = lazy(() => import('./pages/citizen/Home'))
const SOS = lazy(() => import('./pages/citizen/SOS'))
const ReportForm = lazy(() => import('./pages/citizen/ReportForm'))
const ReportTracker = lazy(() => import('./pages/citizen/ReportTracker'))
const ShelterFinder = lazy(() => import('./pages/citizen/ShelterFinder'))
const Alerts = lazy(() => import('./pages/citizen/Alerts'))
const ReportDamage = lazy(() => import('./pages/citizen/ReportDamage'))
const MissingPersons = lazy(() => import('./pages/citizen/MissingPersons'))
const SafeRoutes = lazy(() => import('./pages/citizen/SafeRoutes'))
const SafetyCheckin = lazy(() => import('./pages/citizen/SafetyCheckin'))
const PfaChat = lazy(() => import('./pages/citizen/PfaChat'))
const About = lazy(() => import('./pages/citizen/About'))
const Contacts = lazy(() => import('./pages/citizen/Contacts'))
const AppDownload = lazy(() => import('./pages/citizen/AppDownload'))

const AdminLogin = lazy(() => import('./pages/admin/Login'))
const Overview = lazy(() => import('./pages/admin/Overview'))
const LiveSOS = lazy(() => import('./pages/admin/LiveSOS'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const AdminMissingPersons = lazy(() => import('./pages/admin/MissingPersons'))
const Volunteers = lazy(() => import('./pages/admin/Volunteers'))
const DamageAssessment = lazy(() => import('./pages/admin/DamageAssessment'))
const AdminShelters = lazy(() => import('./pages/admin/Shelters'))
const Agencies = lazy(() => import('./pages/admin/Agencies'))
const Communications = lazy(() => import('./pages/admin/Communications'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'))
const SafetyRegistry = lazy(() => import('./pages/admin/SafetyRegistry'))
const Settings = lazy(() => import('./pages/admin/Settings'))

const VolunteerLogin = lazy(() => import('./pages/volunteer/Login'))
const VolunteerDashboard = lazy(() => import('./pages/volunteer/Dashboard'))
const AssignedTasks = lazy(() => import('./pages/volunteer/AssignedTasks'))
const VolunteerCheckIn = lazy(() => import('./pages/volunteer/CheckIn'))

function RouteFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 py-8">
      <div className="skeleton-shimmer h-10 w-56 rounded-xl" />
      <div className="skeleton-shimmer h-5 w-80 rounded-lg" />
      <div className="skeleton-shimmer h-72 rounded-2xl" />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/sos" element={<SOS />} />
            <Route path="/report" element={<ReportForm />} />
            <Route path="/track" element={<ReportTracker />} />
            <Route path="/shelters" element={<ShelterFinder />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/checkin" element={<SafetyCheckin />} />
            <Route path="/report-damage" element={<ReportDamage />} />
            <Route path="/missing-persons" element={<MissingPersons />} />
            <Route path="/safe-routes" element={<SafeRoutes />} />
            <Route path="/about" element={<About />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/pfa-chat" element={<PfaChat />} />
            <Route path="/app" element={<AppDownload />} />
          </Route>

          {/* Admin Portal (Protected) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="live-sos" element={<LiveSOS />} />
            <Route path="damage" element={<DamageAssessment />} />
            <Route path="reports" element={<Reports />} />
            <Route path="missing-persons" element={<AdminMissingPersons />} />
            <Route path="volunteers" element={<Volunteers />} />
            <Route path="shelters" element={<AdminShelters />} />
            <Route path="agencies" element={<Agencies />} />
            <Route path="communications" element={<Communications />} />
            <Route path="alerts" element={<Communications />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="safety-checkins" element={<SafetyRegistry />} />
            <Route path="safety-registry" element={<SafetyRegistry />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Volunteer Portal (Protected) */}
          <Route path="/volunteer/login" element={<VolunteerLogin />} />
          <Route path="/volunteer" element={<VolunteerLayout />}>
            <Route index element={<VolunteerDashboard />} />
            <Route path="tasks" element={<AssignedTasks />} />
            <Route path="check-in" element={<VolunteerCheckIn />} />
          </Route>

          {/* Aliases for direct URL typing & common variations */}
          <Route path="/volunteers" element={<Navigate to="/volunteer" replace />} />
          <Route path="/volienter" element={<Navigate to="/volunteer" replace />} />
          <Route path="/volunter" element={<Navigate to="/volunteer" replace />} />
          <Route path="/vorianters" element={<Navigate to="/volunteer" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
