import {
  FiMap,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiMic,
  FiClock,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiPhone,
  FiShare2,
} from "react-icons/fi";
import {
  FaHospital,
  FaWarehouse,
  FaCar,
  FaRoute,
  FaBullhorn,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

const RouteOptionCard = ({
  title,
  distance,
  time,
  safety,
  color,
  isSelected,
}) => (
  <motion.div
    className={`cursor-pointer rounded-xl border p-4 transition-colors ${
      isSelected
        ? `border-${color}-500/50 bg-${color}-500/10`
        : "border-white/10 bg-zinc-900/50 hover:bg-zinc-800/50"
    }`}
  >
    <h4 className="font-semibold">{title}</h4>
    <div className="mt-2 flex justify-between text-sm">
      <span>{distance}</span>
      <span>{time}</span>
      <span className={`font-bold text-${color}-400`}>{safety}</span>
    </div>
  </motion.div>
);

const RoadConditionItem = ({ icon, text, location, time, color }) => (
  <div className="flex items-start gap-4">
    <div className={`mt-1 text-2xl ${color}`}>{icon}</div>
    <div>
      <p className="font-semibold">{text}</p>
      <p className="text-xs text-zinc-400">
        {location} • {time}
      </p>
    </div>
  </div>
);

const SafeRoutesDashboard = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    let map;
    import("leaflet")
      .then((L) => {
        if (mapRef.current && !mapRef.current._leaflet_id) {
          map = L.map(mapRef.current, {
            center: [12.9716, 77.5946], // Bengaluru
            zoom: 13,
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
      <div className="mx-auto max-w-8xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <FiMap className="text-blue-500" />
            Safe Route Navigation
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Navigate safely with AI-powered routes that avoid disaster zones,
            blocked roads, and high-risk areas.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <FiMapPin /> Bengaluru, Karnataka
            </span>
            <span className="flex items-center gap-2">🛰 GPS Connected</span>
            <span>🕒 Last Updated: 2 minutes ago</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel */}
          <div className="space-y-6 lg:col-span-4">
            {/* Search Panel */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
              <div className="relative">
                <FiSearch className="absolute left-3 top-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Enter Destination"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 placeholder-zinc-500 focus:border-blue-500/50 focus:ring-blue-500/50"
                />
              </div>
              <div className="mt-4 flex gap-4">
                <button className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-500">
                  Find Safe Route
                </button>
                <button className="rounded-lg bg-white/10 p-2 hover:bg-white/20">
                  <FiMic />
                </button>
              </div>
            </div>

            {/* Route Details */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">Route Details</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">4.2 km</p>
                  <p className="text-xs text-zinc-400">Distance</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">11 min</p>
                  <p className="text-xs text-zinc-400">ETA</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">96%</p>
                  <p className="text-xs text-zinc-400">Safety Score</p>
                </div>
              </div>
            </div>

            {/* Alternative Routes */}
            <div className="space-y-3">
              <RouteOptionCard
                title="Route A (Safest)"
                distance="4.2 km"
                time="11 min"
                safety="96%"
                color="green"
                isSelected={true}
              />
              <RouteOptionCard
                title="Route B (Fastest)"
                distance="3.8 km"
                time="9 min"
                safety="82%"
                color="yellow"
              />
              <RouteOptionCard
                title="Route C (Alternative)"
                distance="5.1 km"
                time="13 min"
                safety="95%"
                color="blue"
              />
            </div>

            {/* AI Route Advisory */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">AI Route Advisory</h3>
              <p className="text-sm text-zinc-300">
                "Route A is recommended as it avoids reported waterlogging and
                has access to an active volunteer checkpoint."
              </p>
              <div className="mt-4 space-y-2 text-xs">
                <p className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-400" /> Avoids flood zone
                </p>
                <p className="flex items-center gap-2">
                  <FiXCircle className="text-yellow-400" /> Moderate traffic
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="relative h-[80vh] min-h-[600px] rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm lg:col-span-8">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
            <div className="absolute bottom-4 right-4 space-y-3">
              <QuickAction icon={<FaWarehouse />} />
              <QuickAction icon={<FaHospital />} />
              <QuickAction icon={<FaBullhorn />} />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Live Road Conditions */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Live Road Conditions</h3>
            <div className="space-y-4">
              <RoadConditionItem
                icon={<FiAlertTriangle />}
                text="Waterlogging"
                location="Silk Board Junction"
                time="12m ago"
                color="text-yellow-400"
              />
              <RoadConditionItem
                icon={<FiXCircle />}
                text="Road Closed"
                location="Outer Ring Road"
                time="5m ago"
                color="text-red-400"
              />
            </div>
          </div>

          {/* Nearby Safe Places */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Nearby Safe Places</h3>
            <div className="space-y-4">
              <NearbyPlace
                icon={<FaWarehouse />}
                name="Emergency Shelter"
                distance="2.5 km"
              />
              <NearbyPlace
                icon={<FaHospital />}
                name="St. John's Hospital"
                distance="4.1 km"
              />
            </div>
          </div>

          {/* Emergency Mode & Tips */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Emergency Mode</h3>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-zinc-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Prioritizes safety over speed and enables live location sharing.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-2 text-lg font-semibold">Travel Tips</h3>
              <ul className="space-y-1 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-400" /> Avoid flooded
                  roads.
                </li>
                <li className="flex items-center gap-2">
                  <FiCheckCircle className="text-green-400" /> Follow official
                  routes.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const QuickAction = ({ icon }) => (
  <button className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-zinc-800/80 text-xl text-white backdrop-blur-sm hover:bg-zinc-700">
    {icon}
  </button>
);

const NearbyPlace = ({ icon, name, distance }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="text-xl text-blue-400">{icon}</div>
      <p className="text-sm font-semibold">{name}</p>
    </div>
    <div className="flex items-center gap-4">
      <p className="text-sm text-zinc-400">{distance}</p>
      <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">
        Directions
      </button>
    </div>
  </div>
);

export default SafeRoutesDashboard;
