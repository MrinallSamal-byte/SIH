import {
  FiShield,
  FiMapPin,
  FiBell,
  FiUser,
  FiSettings,
  FiChevronDown,
  FiArrowRight,
  FiCheck,
  FiNavigation,
  FiPhone,
  FiMessageSquare,
  FiShare2,
  FiAlertTriangle,
  FiCloudRain,
  FiWind,
  FiSunrise,
  FiSunset,
  FiEye,
} from "react-icons/fi";
import {
  FaHouseDamage,
  FaUserShield,
  FaRoute,
  FaFirstAid,
  FaBullhorn,
  FaUserFriends,
  FaHospital,
  FaWarehouse,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

const StatCard = ({ icon, label, value, color }) => (
  <div className="rounded-lg bg-white/5 p-4 text-center">
    <div className={`mx-auto mb-2 text-2xl ${color}`}>{icon}</div>
    <p className="text-sm text-zinc-400">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

const AlertCard = ({ icon, title, text, time, color }) => (
  <div
    className={`flex items-start gap-4 rounded-xl border border-white/10 p-4 backdrop-blur-sm ${color}/10`}
  >
    <div className={`mt-1 text-2xl ${color}`}>{icon}</div>
    <div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-zinc-300">{text}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-zinc-500">{time}</p>
        <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">
          Read More
        </button>
      </div>
    </div>
  </div>
);

const QuickActionCard = ({ icon, text }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm transition-colors hover:border-blue-500/50"
  >
    <div className="text-3xl text-blue-400">{icon}</div>
    <p className="text-xs font-medium">{text}</p>
  </motion.div>
);

const SafetyDashboard = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    let map;
    import("leaflet")
      .then((L) => {
        if (mapRef.current && !mapRef.current._leaflet_id) {
          map = L.map(mapRef.current, {
            center: [20.5937, 78.9629], // India
            zoom: 5,
            zoomControl: false,
            attributionControl: false,
          });

          L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            { maxZoom: 19 },
          ).addTo(map);
        }
      })
      .catch((e) => console.error("Error loading Leaflet:", e));

    return () => {
      if (map) map.remove();
    };
  }, []);

  return (
    <main className="flex-1 overflow-y-auto bg-[#09090B] p-6 font-sans text-white lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <FiShield className="text-blue-500" />
            Your Safety Dashboard
          </h1>
          <p className="mt-2 text-zinc-400">
            Monitor local risks, receive safety guidance, and stay prepared for
            emergencies.
          </p>
          <div className="mt-4 flex items-center gap-6 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <FiMapPin /> Bengaluru, Karnataka
            </span>
            <span>Last Updated: 2 minutes ago</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-8">
            {/* Current Safety Status */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm md:col-span-1">
                <div className="relative h-32 w-32">
                  <svg className="h-full w-full" viewBox="0 0 36 36">
                    <path
                      className="text-green-500/20"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      className="text-green-500"
                      strokeDasharray="92, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold text-green-400">92%</p>
                    <p className="text-xs font-semibold text-green-400">SAFE</p>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold">Safety Score</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:col-span-2">
                <h3 className="mb-4 font-semibold">Current Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Risk Level</p>
                    <p className="font-bold text-green-400">Low</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Weather</p>
                    <p className="font-semibold">Light Rain</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Air Quality</p>
                    <p className="font-semibold">Good</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Network</p>
                    <p className="font-semibold text-green-400">Online</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Mesh Network</p>
                    <p className="font-semibold text-blue-400">Available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Disaster Alerts */}
            <div>
              <h2 className="mb-4 text-xl font-bold">Live Disaster Alerts</h2>
              <div className="space-y-4">
                <AlertCard
                  icon={<FiCloudRain />}
                  title="Heavy Rain Alert"
                  text="Moderate rainfall expected in the next 3 hours."
                  time="15m ago"
                  color="text-yellow-400"
                />
                <AlertCard
                  icon={<FiAlertTriangle />}
                  title="Waterlogging Reported"
                  text="Avoid Outer Ring Road due to waterlogging."
                  time="35m ago"
                  color="text-orange-400"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="mb-4 text-xl font-bold">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <QuickActionCard icon={<FaBullhorn />} text="Emergency SOS" />
                <QuickActionCard icon={<FaWarehouse />} text="Find Shelter" />
                <QuickActionCard icon={<FaRoute />} text="Safe Route" />
                <QuickActionCard icon={<FaFirstAid />} text="Medical Help" />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-4">
            {/* Safe Route */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <h3 className="mb-4 font-semibold">Safe Route</h3>
              <div className="mb-4 h-32 rounded-lg bg-zinc-800">
                {/* Mini Map Placeholder */}
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-zinc-400">To:</span> Nearest Safe
                  Shelter
                </p>
                <p>
                  <span className="text-zinc-400">Time:</span> 12 minutes
                </p>
              </div>
              <button className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-500">
                View Safe Route
              </button>
            </div>

            {/* Emergency Preparedness */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Emergency Preparedness</h3>
                <div className="relative h-10 w-10">
                  <svg className="h-full w-full" viewBox="0 0 36 36">
                    <path
                      className="text-blue-500/20"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-blue-500"
                      strokeDasharray="75, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    75%
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-zinc-300">
                  <FiCheck className="text-green-400" /> Water & Food
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <FiCheck className="text-green-400" /> First-Aid Kit
                </li>
                <li className="flex items-center gap-2 text-zinc-300">
                  <FiCheck className="text-green-400" /> Flashlight
                </li>
                <li className="flex items-center gap-2 text-zinc-500">
                  <FiCheck className="opacity-0" /> Important Documents
                </li>
              </ul>
            </div>

            {/* Family Safety */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 font-semibold">Family Safety</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Jane Doe</p>
                    <p className="text-xs text-green-400">Safe • 5m ago</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md bg-white/10 p-2 hover:bg-white/20">
                      <FiPhone />
                    </button>
                    <button className="rounded-md bg-white/10 p-2 hover:bg-white/20">
                      <FiMessageSquare />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Mike Doe</p>
                    <p className="text-xs text-yellow-400">
                      Low Battery • 1h ago
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md bg-white/10 p-2 hover:bg-white/20">
                      <FiPhone />
                    </button>
                    <button className="rounded-md bg-white/10 p-2 hover:bg-white/20">
                      <FiMessageSquare />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Map */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Live Area Map</h2>
          <div className="h-[400px] w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
};

export default SafetyDashboard;
