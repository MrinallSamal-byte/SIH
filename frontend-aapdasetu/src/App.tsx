import { type ComponentType, lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import VolunteerLayout from './layouts/VolunteerLayout'

// ⚡ Resilient Code Splitting with Automatic Chunk-Refresh Recovery
function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('aapdasetu_chunk_reload') || 'false'
    )

    try {
      const component = await componentImport()
      window.sessionStorage.setItem('aapdasetu_chunk_reload', 'false')
      return component
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        // Stale chunk detected from earlier deployment, reload cleanly
        console.warn('[AapdaSetu] Chunk load failed, force refreshing for latest bundle:', error)
        window.sessionStorage.setItem('aapdasetu_chunk_reload', 'true')
        window.location.reload()
        return new Promise(() => {}) // Hang until reload triggers
      }
      throw error
    }
  })
}

const Home = lazyWithRetry(() => import('./pages/citizen/Home'))
const SOS = lazyWithRetry(() => import('./pages/citizen/SOS'))
const ReportForm = lazyWithRetry(() => import('./pages/citizen/ReportForm'))
const ReportTracker = lazyWithRetry(() => import('./pages/citizen/ReportTracker'))
const SafetyCheckin = lazyWithRetry(() => import('./pages/citizen/SafetyCheckin'))
const ShelterFinder = lazyWithRetry(() => import('./pages/citizen/ShelterFinder'))
const Alerts = lazyWithRetry(() => import('./pages/citizen/Alerts'))
const ReportDamage = lazyWithRetry(() => import('./pages/citizen/ReportDamage'))
const MissingPersons = lazyWithRetry(() => import('./pages/citizen/MissingPersons'))
const SafeRoutes = lazyWithRetry(() => import('./pages/citizen/SafeRoutes'))
const PfaChat = lazyWithRetry(() => import('./pages/citizen/PfaChat'))

const AdminLogin = lazyWithRetry(() => import('./pages/admin/Login'))
const Overview = lazyWithRetry(() => import('./pages/admin/Overview'))
const LiveSOS = lazyWithRetry(() => import('./pages/admin/LiveSOS'))
const Reports = lazyWithRetry(() => import('./pages/admin/Reports'))
const AdminMissingPersons = lazyWithRetry(() => import('./pages/admin/MissingPersons'))
const Volunteers = lazyWithRetry(() => import('./pages/admin/Volunteers'))
const DamageAssessment = lazyWithRetry(() => import('./pages/admin/DamageAssessment'))
const AdminShelters = lazyWithRetry(() => import('./pages/admin/Shelters'))
const Agencies = lazyWithRetry(() => import('./pages/admin/Agencies'))
const Communications = lazyWithRetry(() => import('./pages/admin/Communications'))
const Analytics = lazyWithRetry(() => import('./pages/admin/Analytics'))
const AuditLogs = lazyWithRetry(() => import('./pages/admin/AuditLogs'))
const SafetyRegistry = lazyWithRetry(() => import('./pages/admin/SafetyRegistry'))
const Settings = lazyWithRetry(() => import('./pages/admin/Settings'))

const VolunteerLogin = lazyWithRetry(() => import('./pages/volunteer/Login'))
const VolunteerDashboard = lazyWithRetry(() => import('./pages/volunteer/Dashboard'))
const AssignedTasks = lazyWithRetry(() => import('./pages/volunteer/AssignedTasks'))
const VolunteerCheckIn = lazyWithRetry(() => import('./pages/volunteer/CheckIn'))

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
            <Route path="/check-in" element={<SafetyCheckin />} />
            <Route path="/shelters" element={<ShelterFinder />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/report-damage" element={<ReportDamage />} />
            <Route path="/missing-persons" element={<MissingPersons />} />
            <Route path="/safe-routes" element={<SafeRoutes />} />
            <Route path="/pfa-chat" element={<PfaChat />} />
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
