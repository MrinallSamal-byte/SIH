import {
  FiHome,
  FiMapPin,
  FiUpload,
  FiCamera,
  FiVideo,
  FiMic,
  FiEdit3,
  FiCheckCircle,
  FiLoader,
} from "react-icons/fi";
import {
  FaWater,
  FaFire,
  FaRoad,
  FaTree,
  FaBolt,
  FaQuestion,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const DamageTypeCard = ({ icon, text, selected, onClick }) => (
  <motion.div
    onClick={onClick}
    whileHover={{ y: -4 }}
    className={`cursor-pointer rounded-xl border p-3 text-center transition-colors ${
      selected
        ? "border-blue-500/50 bg-blue-500/10"
        : "border-white/10 bg-zinc-900/50 hover:bg-zinc-800/50"
    }`}
  >
    <div
      className={`mx-auto mb-1 text-2xl ${selected ? "text-blue-400" : "text-zinc-400"}`}
    >
      {icon}
    </div>
    <p className="text-xs font-medium">{text}</p>
  </motion.div>
);

const ReportDamageDashboard = () => {
  const mapRef = useRef(null);
  const [selectedDamage, setSelectedDamage] = useState("Building Damage");

  const damageTypes = [
    { icon: <FiHome />, text: "Building Damage" },
    { icon: <FaRoad />, text: "Road Damage" },
    { icon: <FaWater />, text: "Flooding" },
    { icon: <FaFire />, text: "Fire Incident" },
    { icon: <FaBolt />, text: "Power Outage" },
    { icon: <FaTree />, text: "Fallen Trees" },
    { icon: <FaQuestion />, text: "Other" },
  ];

  useEffect(() => {
    let map;
    import("leaflet")
      .then((L) => {
        if (mapRef.current && !mapRef.current._leaflet_id) {
          map = L.map(mapRef.current, {
            center: [12.9716, 77.5946], // Bengaluru
            zoom: 12,
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
            <FiHome className="text-orange-500" />
            Report Disaster Damage
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Help authorities by reporting damaged infrastructure, blocked roads,
            and other hazards in your area.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <FiMapPin /> Bengaluru, Karnataka
            </span>
            <span>🕒 Last Updated: 2 minutes ago</span>
            <span className="flex items-center gap-2 text-green-400">
              <FiCheckCircle /> GPS Connected
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-8">
            {/* Damage Type */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">
                What would you like to report?
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
                {damageTypes.map((type) => (
                  <DamageTypeCard
                    key={type.text}
                    {...type}
                    selected={selectedDamage === type.text}
                    onClick={() => setSelectedDamage(type.text)}
                  />
                ))}
              </div>
            </div>

            {/* Upload & Details */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Upload Evidence */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-lg font-semibold">Upload Evidence</h3>
                <div className="grid grid-cols-2 gap-4">
                  <UploadButton icon={<FiCamera />} text="Upload Photo" />
                  <UploadButton icon={<FiVideo />} text="Upload Video" />
                  <UploadButton icon={<FiMic />} text="Record Voice" />
                  <UploadButton icon={<FiEdit3 />} text="Add Description" />
                </div>
              </div>

              {/* Damage Details */}
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <h3 className="mb-4 text-lg font-semibold">Damage Details</h3>
                <div className="space-y-4">
                  <select className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm focus:border-blue-500/50 focus:ring-blue-500/50">
                    <option className="bg-zinc-800">Severity: Moderate</option>
                    <option className="bg-zinc-800">Minor</option>
                    <option className="bg-zinc-800">Severe</option>
                    <option className="bg-zinc-800">Critical</option>
                  </select>
                  <select className="w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm focus:border-blue-500/50 focus:ring-blue-500/50">
                    <option className="bg-zinc-800">
                      Area Affected: One Building
                    </option>
                    <option className="bg-zinc-800">Entire Street</option>
                    <option className="bg-zinc-800">Neighborhood</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Impact Assessment */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">Impact Assessment</h3>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                <Checkbox label="Road Blocked" id="road-blocked" />
                <Checkbox label="People Trapped" id="trapped" />
                <Checkbox label="Power Outage" id="power-outage" />
                <Checkbox label="Water Disrupted" id="water-disrupted" />
                <Checkbox label="Medical Help Needed" id="medical-needed" />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="w-full rounded-lg bg-blue-600 py-3 text-base font-semibold text-white hover:bg-blue-500"
            >
              Submit Damage Report
            </motion.button>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-4">
            {/* Location */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">Location</h3>
              <div className="mb-4 h-40 rounded-lg bg-zinc-800">
                <div ref={mapRef} className="h-full w-full rounded-lg" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-300">
                  123, 5th Main, Koramangala, Bengaluru
                </p>
                <p className="text-xs text-zinc-500">Accuracy: 5m</p>
              </div>
              <div className="mt-4 flex gap-4">
                <button className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold hover:bg-white/20">
                  Use Current Location
                </button>
                <button className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold hover:bg-white/20">
                  Select on Map
                </button>
              </div>
            </div>

            {/* Report Status */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">Report Status</h3>
              <ul className="space-y-4">
                <StatusItem
                  icon={<FiCheckCircle />}
                  text="Report Submitted"
                  isDone
                />
                <StatusItem
                  icon={<FiLoader />}
                  text="Under Verification"
                  isActive
                />
                <StatusItem icon={<FiLoader />} text="Authority Assigned" />
                <StatusItem icon={<FiLoader />} text="Resolved" />
              </ul>
            </div>

            {/* AI Assessment */}
            <div className="rounded-2xl border border-orange-500/20 bg-orange-900/10 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">AI Assessment</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Damage Level</p>
                  <p className="font-bold text-orange-400">Severe</p>
                </div>
                <div>
                  <p className="text-zinc-400">Priority</p>
                  <p className="font-bold text-red-400">High</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-300">
                <span className="font-semibold">Suggested Action:</span>{" "}
                Dispatch rescue team immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const UploadButton = ({ icon, text }) => (
  <button className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 py-4 text-sm font-semibold text-zinc-300 hover:border-white/40 hover:bg-white/10">
    {icon}
    <span>{text}</span>
  </button>
);

const Checkbox = ({ label, id }) => (
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      id={id}
      className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
    />
    <label htmlFor={id} className="text-zinc-300">
      {label}
    </label>
  </div>
);

const StatusItem = ({ icon, text, isDone, isActive }) => (
  <li
    className={`flex items-center gap-3 ${
      isDone ? "text-green-400" : isActive ? "text-blue-400" : "text-zinc-500"
    }`}
  >
    <div
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
        isDone ? "bg-green-500/20" : isActive ? "bg-blue-500/20" : "bg-zinc-700"
      }`}
    >
      {isActive ? <FiLoader className="animate-spin" /> : icon}
    </div>
    <span className="font-semibold">{text}</span>
  </li>
);

export default ReportDamageDashboard;
