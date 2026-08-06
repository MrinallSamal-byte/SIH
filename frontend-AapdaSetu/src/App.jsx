import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Layouts
import MainLayout from "./layouts/MainLayout.jsx";
import CitizenLayout from "./layouts/CitizenLayout.jsx";
import AuthMapLayout from "./layouts/AuthMapLayout.jsx";

// Page Components
import Home from "./pages/Landing/Home.jsx";
import About from "./pages/Landing/About.jsx";
import Login from "./pages/Auth/Login.jsx";
import SignUp from "./pages/Auth/SignUp.jsx";
import CitizenDashboard from "./layouts/CitizenDashboard.jsx";
import EmergencySOS from "./layouts/EmergencySOS.jsx";
import SafetyDashboard from "./layouts/SafetyDashboard.jsx";
import DisasterAlertsDashboard from "./DisasterAlertsDashboard.jsx"; // This was correct
import SafeRoutesDashboard from "./layouts/SafeRoutesDashboard.jsx";
import MedicalAssistanceDashboard from "./pages/Citizen/MedicalAssistanceDashboard.jsx"; // Assuming this file exists at this path
import ReportDamageDashboard from "./pages/Citizen/ReportDamageDashboard.jsx"; // Assuming this file exists at this path
import MissingPersonsDashboard from "./pages/Citizen/MissingPersonsDashboard.jsx"; // Assuming this file exists at this path
import EmergencyContactsDashboard from "./pages/Citizen/EmergencyContactsDashboard.jsx"; // Assuming this file exists at this path

function App() {
  return (
    <Router>
      <Routes>
        {/* Wrap pages in MainLayout to get Navbar and Footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Route>

        {/* Auth routes with Map background */}
        <Route element={<AuthMapLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUp />} />
        </Route>

        {/* Citizen-facing dashboard routes */}
        <Route element={<CitizenLayout />}>
          <Route path="/dashboard" element={<CitizenDashboard />} />
          <Route path="/emergency-sos" element={<EmergencySOS />} />
          <Route path="/safety" element={<SafetyDashboard />} />
          <Route
            path="/disaster-alerts"
            element={<DisasterAlertsDashboard />}
          />
          <Route path="/safe-routes" element={<SafeRoutesDashboard />} />
          <Route
            path="/medical-assistance"
            element={<MedicalAssistanceDashboard />}
          />
          <Route path="/report-damage" element={<ReportDamageDashboard />} />
          <Route
            path="/missing-persons"
            element={<MissingPersonsDashboard />}
          />
          <Route
            path="/emergency-contacts"
            element={<EmergencyContactsDashboard />}
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
