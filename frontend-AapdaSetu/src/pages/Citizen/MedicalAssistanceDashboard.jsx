import {
  FiPlusCircle,
  FiMapPin,
  FiClock,
  FiPhone,
  FiVideo,
  FiMessageSquare,
  FiCheckCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import {
  FaHeartbeat,
  FaTint,
  FaAllergies,
  FaNotesMedical,
  FaUserMd,
  FaAmbulance,
  FaHospital,
  FaFirstAid,
  FaStethoscope,
  FaSyringe,
  FaPills,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const ConditionCard = ({ icon, text, selected, onClick }) => (
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

const FacilityCard = ({ icon, name, distance, details }) => (
  <div className="rounded-lg bg-white/5 p-4">
    <div className="flex items-center gap-3">
      <div className="text-2xl text-green-400">{icon}</div>
      <h4 className="font-semibold">{name}</h4>
    </div>
    <div className="mt-3 flex items-end justify-between">
      <div>
        <p className="text-sm text-zinc-400">{distance}</p>
        <p className="text-xs text-zinc-500">{details}</p>
      </div>
      <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">
        Directions
      </button>
    </div>
  </div>
);

const MedicalAssistanceDashboard = () => {
  const mapRef = useRef(null);
  const [selectedCondition, setSelectedCondition] = useState("Heavy Bleeding");

  const conditions = [
    { icon: <FaHeartbeat />, text: "Chest Pain" },
    { icon: <FaTint />, text: "Heavy Bleeding" },
    { icon: <FaNotesMedical />, text: "Injury" },
    { icon: <FaStethoscope />, text: "Breathing Difficulty" },
    { icon: <FaSyringe />, text: "Snake Bite" },
    { icon: <FaPills />, text: "Poisoning" },
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
            <FiPlusCircle className="text-green-500" />
            Medical Assistance
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Access emergency healthcare services, locate nearby hospitals, and
            connect with medical professionals.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <FiMapPin /> Bengaluru, Karnataka
            </span>
            <span>🕒 Last Updated: 2 minutes ago</span>
            <span className="flex items-center gap-2 text-green-400">
              <FiCheckCircle /> Medical Network Available
            </span>
          </div>
        </div>

        {/* Top Section */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Medical Emergency */}
          <div className="rounded-2xl border border-red-500/20 bg-red-900/20 p-6 backdrop-blur-sm lg:col-span-2">
            <h2 className="text-xl font-semibold">
              Need Immediate Medical Help?
            </h2>
            <p className="text-sm text-red-200">
              Estimated Ambulance Arrival:{" "}
              <span className="font-bold">8 minutes</span>
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="col-span-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-base font-semibold text-white hover:bg-red-500 sm:col-span-1"
              >
                <FaAmbulance /> Request Ambulance
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="rounded-lg bg-white/10 py-3 text-sm font-semibold hover:bg-white/20"
              >
                📞 Call Emergency
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="rounded-lg bg-white/10 py-3 text-sm font-semibold hover:bg-white/20"
              >
                🆘 Send Medical SOS
              </motion.button>
            </div>
          </div>

          {/* Medical Profile */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Medical Profile</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>
                <span className="text-zinc-400">Blood:</span> O+
              </p>
              <p>
                <span className="text-zinc-400">Allergies:</span> None
              </p>
              <p className="col-span-2">
                <span className="text-zinc-400">Conditions:</span> Diabetes
              </p>
            </div>
            <button className="mt-4 w-full rounded-lg bg-white/10 py-2 text-xs font-semibold hover:bg-white/20">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Health Condition */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">
                Choose your emergency
              </h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {conditions.map((condition) => (
                  <ConditionCard
                    key={condition.text}
                    {...condition}
                    selected={selectedCondition === condition.text}
                    onClick={() => setSelectedCondition(condition.text)}
                  />
                ))}
              </div>
            </div>

            {/* AI First Aid Guide */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-900/10 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">
                Immediate First Aid Instructions
              </h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-300">
                <li>Apply firm, direct pressure to the wound.</li>
                <li>Raise the injured limb above the heart if possible.</li>
                <li>Do not remove any large or deeply embedded objects.</li>
                <li>Keep the person calm and still.</li>
              </ol>
              <p className="mt-4 text-xs text-yellow-400">
                Disclaimer: This is not a substitute for professional medical
                care.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-1">
            {/* Nearby Medical Facilities */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">
                Nearby Medical Facilities
              </h3>
              <div className="space-y-4">
                <FacilityCard
                  icon={<FaHospital />}
                  name="City Hospital"
                  distance="3.2 km"
                  details="Beds: 8/20"
                />
                <FacilityCard
                  icon={<FaAmbulance />}
                  name="Ambulance Station"
                  distance="1.5 km"
                  details="ETA: 5 min"
                />
                <FacilityCard
                  icon={<FaPills />}
                  name="24/7 Pharmacy"
                  distance="1.8 km"
                  details="Open Now"
                />
              </div>
            </div>

            {/* Telemedicine */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold">Telemedicine</h3>
              <div className="space-y-3">
                <button className="flex w-full items-center gap-3 rounded-lg bg-white/5 p-3 text-left hover:bg-white/10">
                  <FiVideo className="text-blue-400" />
                  <span>Video Consultation</span>
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg bg-white/5 p-3 text-left hover:bg-white/10">
                  <FiMessageSquare className="text-blue-400" />
                  <span>Chat with Doctor</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Map */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Medical Resources Map</h2>
          <div className="h-[400px] w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
          </div>
        </div>

        {/* Medical Alerts */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Medical Alerts</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AlertItem
              icon={<FiAlertTriangle />}
              title="Heat Stroke Warning"
              time="1h ago"
              color="text-orange-400"
            />
            <AlertItem
              icon={<FiAlertTriangle />}
              title="Water Contamination Alert"
              time="3h ago"
              color="text-yellow-400"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

const AlertItem = ({ icon, title, time, color }) => (
  <div
    className={`flex items-center gap-4 rounded-xl border border-white/10 p-4 ${color}/10`}
  >
    <div className={`text-2xl ${color}`}>{icon}</div>
    <div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-xs text-zinc-400">{time}</p>
    </div>
  </div>
);

export default MedicalAssistanceDashboard;
