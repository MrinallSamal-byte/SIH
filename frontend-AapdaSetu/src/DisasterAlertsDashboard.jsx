import {
  FiAlertTriangle,
  FiMapPin,
  FiFilter,
  FiSearch,
  FiCheckCircle,
  FiShield,
  FiPhone,
  FiCloudRain,
  FiWind,
  FiEye,
  FiThermometer,
  FiDroplet,
} from "react-icons/fi";
import {
  FaWater,
  FaFire,
  FaExclamationTriangle,
  FaBuilding,
  FaCarCrash,
  FaHospital,
  FaWarehouse,
  FaRoute,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

const SummaryCard = ({ icon, label, value, trend, color }) => (
  <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
    <div className="flex items-center justify-between">
      <div className={`text-3xl ${color}`}>{icon}</div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}/20`}
      >
        {trend}
      </span>
    </div>
    <p className="mt-4 text-3xl font-bold">{value}</p>
    <p className="text-sm text-zinc-400">{label}</p>
  </div>
);

const AlertFeedItem = ({ icon, type, location, severity, time, desc }) => {
  const severityStyles = {
    HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  return (
    <div
      className={`rounded-xl border bg-zinc-900/50 p-4 ${severityStyles[severity]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl text-white">{icon}</div>
          <div>
            <h4 className="font-semibold">{type}</h4>
            <p className="text-xs text-zinc-400">
              {location} • {time}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${severityStyles[severity]}`}
        >
          {severity}
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-300">{desc}</p>
      <div className="mt-4 flex gap-4">
        <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">
          View Details
        </button>
        <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">
          Safe Route
        </button>
      </div>
    </div>
  );
};

const DisasterAlertsDashboard = () => {
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
            <FiAlertTriangle className="text-red-500" />
            Disaster Alerts
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Stay informed with verified real-time disaster warnings, weather
            updates, and emergency advisories in your area.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <FiMapPin /> Bengaluru, Karnataka
            </span>
            <span>🕒 Last Updated: 2 minutes ago</span>
            <span>🌐 Data Source: IMD, NDMA, Local Authorities</span>
          </div>
        </div>

        {/* Current Risk Overview */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<FiAlertTriangle />}
            label="Active Alerts"
            value="3"
            trend="+1"
            color="text-red-500"
          />
          <SummaryCard
            icon={<FiAlertTriangle />}
            label="Moderate Warnings"
            value="8"
            trend="-2"
            color="text-yellow-500"
          />
          <SummaryCard
            icon={<FiShield />}
            label="Safe Zones Nearby"
            value="12"
            trend="Stable"
            color="text-green-500"
          />
          <SummaryCard
            icon={<FaHospital />}
            label="Response Status"
            value="Active"
            trend=""
            color="text-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column - Live Alert Feed */}
          <div className="space-y-6 lg:col-span-5">
            <h2 className="text-xl font-bold">Live Alert Feed</h2>
            <div className="space-y-4">
              <AlertFeedItem
                icon={<FaWater />}
                type="Flood Warning"
                location="Koramangala, Bengaluru"
                severity="HIGH"
                time="5m ago"
                desc="Heavy rainfall has caused waterlogging in low-lying areas."
              />
              <AlertFeedItem
                icon={<FaFire />}
                type="Fire Incident"
                location="Whitefield, Bengaluru"
                severity="MODERATE"
                time="2h ago"
                desc="Small fire reported in an industrial area. Firefighters on site."
              />
            </div>
          </div>

          {/* Right Column - Interactive Map */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Interactive Map</h2>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/50 p-2 text-sm">
                <FiFilter className="text-zinc-400" />
                <select className="bg-transparent focus:outline-none">
                  <option className="bg-zinc-800">All Disasters</option>
                  <option className="bg-zinc-800">Flood</option>
                  <option className="bg-zinc-800">Fire</option>
                </select>
              </div>
            </div>
            <div className="mt-4 h-[400px] w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm">
              <div ref={mapRef} className="h-full w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Emergency Advisory & Nearby Resources */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm lg:col-span-1">
            <h3 className="mb-4 text-lg font-semibold">Recommended Actions</h3>
            <ul className="space-y-2 text-sm text-zinc-300">
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-blue-400" /> Stay indoors.
              </li>
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-blue-400" /> Avoid flooded roads.
              </li>
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-blue-400" /> Charge your phone.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm lg:col-span-2">
            <h3 className="mb-4 text-lg font-semibold">Nearby Resources</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ResourceCard
                icon={<FaWarehouse />}
                name="Shelter"
                detail1="2.5 km"
                detail2="Capacity: 45/100"
              />
              <ResourceCard
                icon={<FaHospital />}
                name="Hospital"
                detail1="4.1 km"
                detail2="Beds: 12/50"
              />
              <ResourceCard
                icon={<FaRoute />}
                name="Rescue Team"
                detail1="1.8 km"
                detail2="ETA: 8 min"
              />
            </div>
          </div>
        </div>

        {/* Weather & Community Reports */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Weather Monitoring</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <WeatherStat
                icon={<FiThermometer />}
                label="Temperature"
                value="28°C"
              />
              <WeatherStat
                icon={<FiCloudRain />}
                label="Rainfall"
                value="12mm"
              />
              <WeatherStat icon={<FiWind />} label="Wind" value="15 km/h" />
              <WeatherStat icon={<FiDroplet />} label="Humidity" value="85%" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Community Reports</h3>
            <div className="space-y-3 text-sm">
              <CommunityReport
                text="Road Blocked at Marathahalli"
                distance="3 km"
                time="10m ago"
              />
              <CommunityReport
                text="Power Outage in HSR Layout"
                distance="5 km"
                time="25m ago"
              />
            </div>
          </div>
        </div>

        {/* Hotlines & Settings */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Emergency Hotlines</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <HotlineButton name="Police" number="100" />
              <HotlineButton name="Fire" number="101" />
              <HotlineButton name="Ambulance" number="108" />
              <HotlineButton name="Disaster Control" number="1077" />
              <HotlineButton name="Women Helpline" number="1091" />
              <HotlineButton name="Child Helpline" number="1098" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">
              Notification Settings
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <ToggleSwitch label="Floods" id="floods" />
              <ToggleSwitch label="Earthquakes" id="earthquakes" />
              <ToggleSwitch label="Cyclones" id="cyclones" />
              <ToggleSwitch label="Road Closures" id="closures" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const ResourceCard = ({ icon, name, detail1, detail2 }) => (
  <div className="rounded-lg bg-white/10 p-4 text-center">
    <div className="mx-auto mb-2 text-2xl text-blue-400">{icon}</div>
    <p className="font-semibold">{name}</p>
    <p className="text-xs text-zinc-400">{detail1}</p>
    <p className="text-xs text-zinc-400">{detail2}</p>
  </div>
);

const WeatherStat = ({ icon, label, value }) => (
  <div className="text-center">
    <div className="mx-auto mb-1 text-2xl text-zinc-400">{icon}</div>
    <p className="text-xs text-zinc-500">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

const CommunityReport = ({ text, distance, time }) => (
  <div className="flex items-center justify-between">
    <p className="text-zinc-300">{text}</p>
    <div className="flex items-center gap-4 text-xs text-zinc-500">
      <span>{distance}</span>
      <span>{time}</span>
      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-green-400">
        Verified
      </span>
    </div>
  </div>
);

const HotlineButton = ({ name, number }) => (
  <button className="rounded-lg bg-white/10 p-3 text-center hover:bg-white/20">
    <p className="font-semibold">{name}</p>
    <p className="text-xs text-zinc-400">{number}</p>
  </button>
);

const ToggleSwitch = ({ label, id }) => (
  <div className="flex items-center justify-between">
    <label htmlFor={id}>{label}</label>
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" id={id} className="peer sr-only" defaultChecked />
      <div className="peer h-6 w-11 rounded-full bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
    </label>
  </div>
);

export default DisasterAlertsDashboard;
