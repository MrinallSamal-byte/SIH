import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import VolunteerLayout from './layouts/VolunteerLayout'

import Home from './pages/citizen/Home'
import SOS from './pages/citizen/SOS'
import ReportForm from './pages/citizen/ReportForm'
import ReportTracker from './pages/citizen/ReportTracker'
import SafetyCheckin from './pages/citizen/SafetyCheckin'
import ShelterFinder from './pages/citizen/ShelterFinder'
import Alerts from './pages/citizen/Alerts'
import ReportDamage from './pages/citizen/ReportDamage'
import MissingPersons from './pages/citizen/MissingPersons'
import SafeRoutes from './pages/citizen/SafeRoutes'
import PfaChat from './pages/citizen/PfaChat'

import AdminLogin from './pages/admin/Login'
import Overview from './pages/admin/Overview'
import LiveSOS from './pages/admin/LiveSOS'
import Reports from './pages/admin/Reports'
import AdminMissingPersons from './pages/admin/MissingPersons'
import Volunteers from './pages/admin/Volunteers'
import AdminShelters from './pages/admin/Shelters'
import Agencies from './pages/admin/Agencies'
import Communications from './pages/admin/Communications'
import Analytics from './pages/admin/Analytics'
import AuditLogs from './pages/admin/AuditLogs'
import Settings from './pages/admin/Settings'

import VolunteerDashboard from './pages/volunteer/Dashboard'
import AssignedTasks from './pages/volunteer/AssignedTasks'
import VolunteerCheckIn from './pages/volunteer/CheckIn'

export default function App() {
  return (
    <HashRouter>
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

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="live-sos" element={<LiveSOS />} />
          <Route path="reports" element={<Reports />} />
          <Route path="missing-persons" element={<AdminMissingPersons />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="shelters" element={<AdminShelters />} />
          <Route path="agencies" element={<Agencies />} />
          <Route path="communications" element={<Communications />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/volunteer" element={<VolunteerLayout />}>
          <Route index element={<VolunteerDashboard />} />
          <Route path="tasks" element={<AssignedTasks />} />
          <Route path="check-in" element={<VolunteerCheckIn />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
