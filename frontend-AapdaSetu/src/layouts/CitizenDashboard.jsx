import { useEffect, useRef } from "react";
import {
  FiWifi,
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiCompass,
  FiHome,
  FiMap,
  FiMapPin,
  FiPhone,
  FiSearch,
  FiSettings,
  FiSun,
  FiShield,
} from "react-icons/fi";
import {
  FaHouseDamage,
  FaUserShield,
  FaRoute,
  FaFirstAid,
  FaUserFriends,
  FaBullhorn,
  FaClipboardList,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";

const SidebarLink = ({ icon, text, active, path = "#" }) => (
  <Link
    to={path}
    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"}`}
  >
    {icon}
    {text}
  </Link>
);

const CitizenDashboard = () => {
  const riskLevels = {
    low: {
      text: "Low Risk",
      color: "bg-green-500",
      textColor: "text-green-300",
    },
    medium: {
      text: "Medium Risk",
      color: "bg-yellow-500",
      textColor: "text-yellow-300",
    },
    high: {
      text: "High Risk",
      color: "bg-orange-500",
      textColor: "text-orange-300",
    },
    critical: {
      text: "Critical Risk",
      color: "bg-red-500",
      textColor: "text-red-300",
    },
  };
  const currentRisk = riskLevels.low;

  const mapRef = useRef(null);

  useEffect(() => {
    let map;
    import("leaflet")
      .then((L) => {
        const userLocation = [12.9716, 77.5946]; // Bengaluru

        if (mapRef.current && !mapRef.current._leaflet_id) {
          map = L.map(mapRef.current, {
            center: userLocation,
            zoom: 14, // Increased zoom level for a more local view
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            attributionControl: false,
          });

          L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            {
              maxZoom: 19,
            },
          ).addTo(map);

          const highRiskIcon = L.divIcon({
            className: "high-risk-marker",
            html: `<div class="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_2px_rgba(239,68,68,0.7)]"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          const lowRiskIcon = L.divIcon({
            className: "low-risk-marker",
            html: `<div class="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.7)]"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          const userLocationIcon = L.divIcon({
            className: "user-location-marker",
            html: `<div class="w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-lg animate-pulse"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          const highRiskAreas = [
            { lat: 13.08, lng: 77.58, name: "Hebbal (High Risk)" },
            { lat: 12.91, lng: 77.67, name: "Bellandur (High Risk)" },
          ];

          const lowRiskAreas = [
            { lat: 12.97, lng: 77.5, name: "Vijayanagar (Low Risk)" },
            { lat: 12.84, lng: 77.66, name: "Electronic City (Low Risk)" },
          ];

          // Add a marker for the user's current location
          L.marker(userLocation, { icon: userLocationIcon })
            .addTo(map)
            .bindTooltip("Your Location");

          highRiskAreas.forEach((area) => {
            L.marker([area.lat, area.lng], { icon: highRiskIcon })
              .addTo(map)
              .bindTooltip(area.name);
          });

          lowRiskAreas.forEach((area) => {
            L.marker([area.lat, area.lng], { icon: lowRiskIcon })
              .addTo(map)
              .bindTooltip(area.name);
          });
        }
      })
      .catch((e) => console.error("Error loading Leaflet:", e));

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Welcome back, John 👋</h1>
      <div className="mx-auto max-w-7xl">
        {/* Row 1: Status & Tips */}
        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* System Status Card */}
          <div className="col-span-12 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-3 lg:grid-cols-6">
              <div className="flex items-center gap-3">
                <FiMapPin className="text-blue-400" />
                <div>
                  <p className="text-zinc-500">Location</p>
                  <p className="font-semibold">Bengaluru</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${currentRisk.color}/20`}
                >
                  <FiAlertTriangle className={currentRisk.textColor} />
                </div>
                <div>
                  <p className="text-zinc-500">Risk Level</p>
                  <p className={`font-semibold ${currentRisk.textColor}`}>
                    {currentRisk.text}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiSun className="text-yellow-400" />
                <div>
                  <p className="text-zinc-500">Weather</p>
                  <p className="font-semibold">32°C Clear</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiCheckCircle className="text-zinc-400" />
                <div>
                  <p className="text-zinc-500">Last Updated</p>
                  <p className="font-semibold">2 min ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiWifi className="text-green-400" />
                <div>
                  <p className="text-zinc-500">Network</p>
                  <p className="font-semibold">Connected</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiCompass className="text-green-400" />
                <div>
                  <p className="text-zinc-500">GPS</p>
                  <p className="font-semibold">Locked</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Emergency SOS */}
        <div className="mt-6 h-96 w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm">
          <div ref={mapRef} className="h-full w-full rounded-lg" />
        </div>

        {/* Row 3: Key Info Cards */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard title="Nearby Shelter" icon={<FiShield />}>
            <div className="flex-grow">
              <p className="text-2xl font-bold">Community Hall</p>
              <p className="text-sm text-zinc-400">2.5 km away</p>
              <p className="mt-2 text-sm text-zinc-400">
                Capacity:{" "}
                <span className="font-semibold text-green-400">45/100</span>
              </p>
            </div>
            <button className="mt-6 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-500">
              Navigate
            </button>
          </InfoCard>
          <InfoCard title="Safe Route" icon={<FiCompass />}>
            <div className="flex-grow">
              <p className="text-2xl font-bold">To Exhibition Center</p>
              <p className="text-sm text-zinc-400">Estimated Time: 15 min</p>
              <p className="mt-2 text-sm text-zinc-400">
                6.8 km via safe roads
              </p>
            </div>
            <button className="mt-6 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-500">
              View Route
            </button>
          </InfoCard>
          <InfoCard title="Recent Activity" icon={<FaClipboardList />}>
            <div className="flex-grow space-y-4">
              <ActivityItem
                icon={<FiMapPin />}
                text="Location shared with rescue team"
                time="5m ago"
              />
              <ActivityItem
                icon={<FiShield />}
                text="Checked into Community Hall shelter"
                time="2h ago"
              />
              <ActivityItem
                icon={<FaBullhorn />}
                text="SOS sent: Medical Emergency"
                time="1d ago"
              />
            </div>
          </InfoCard>
        </div>

        {/* Row 4: Alerts & Activity */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3"></div>
      </div>
    </main>
  );
};

const InfoCard = ({ title, icon, children }) => (
  <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
    <div className="mb-4 flex items-center gap-3">
      <div className="text-blue-400">{icon}</div>
      <h3 className="font-semibold text-zinc-300">{title}</h3>
    </div>
    {children}
  </div>
);

const ActivityItem = ({ icon, text, time }) => (
  <div className="flex items-center gap-4">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-zinc-200">{text}</p>
      <p className="text-xs text-zinc-500">{time}</p>
    </div>
  </div>
);

export default CitizenDashboard;
