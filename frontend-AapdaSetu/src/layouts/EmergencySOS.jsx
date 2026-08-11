import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  FaWater,
  FaFire,
  FaBuilding,
  FaCarCrash,
  FaWind,
  FaQuestion,
  FaHandsHelping,
  FaHome,
  FaExclamationTriangle,
  FaAmbulance,
  FaUserFriends,
} from "react-icons/fa";
import {
  FiRefreshCw,
  FiUpload,
  FiMic,
  FiCheckCircle,
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";

const EmergencyTypeCard = ({ icon, text, selected, onClick }) => (
  <motion.button
    onClick={onClick}
    animate={{ scale: selected ? 1.05 : 1 }}
    whileHover={{ scale: 1.1 }}
    className={`relative flex h-[90px] w-[90px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition-all duration-200 ${
      selected
        ? "border-red-500/80 bg-red-900/20"
        : "border-white/10 bg-white/5 hover:border-white/20"
    }`}
  >
    <div
      className={`mx-auto text-3xl ${
        selected ? "text-red-400" : "text-zinc-400"
      }`}
    >
      {icon}
    </div>
    <p
      className={`text-sm font-medium ${
        selected ? "text-white" : "text-zinc-300"
      }`}
    >
      {text}
    </p>
    {selected && (
      <motion.div
        layoutId="emergency-glow"
        className="absolute inset-0 rounded-2xl shadow-[0_0_20px_3px_rgba(239,68,68,0.4)]"
      />
    )}
  </motion.button>
);

const SOSButton = () => {
  const [isHolding, setIsHolding] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isSent, setIsSent] = useState(false);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const controls = useAnimation();
  const progress = useMotionValue(0);
  const pathLength = useTransform(progress, (v) => v * 2 * Math.PI * 130);

  const handleMouseDown = () => {
    if (isSent) return;
    setIsHolding(true);
    setCountdown(3);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => prev - 1);
      progress.set(progress.get() + 1 / 3);
    }, 1000);

    timerRef.current = setTimeout(() => {
      setIsSent(true);
      controls.start({
        pathLength: 1,
        transition: { duration: 0.5, ease: "easeOut" },
      });
      clearInterval(intervalRef.current);
    }, 3000);
  };

  const handleMouseUp = () => {
    setIsHolding(false);
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    if (!isSent) {
      setCountdown(3);
      progress.set(0);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <motion.button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp} // prettier-ignore
        className="relative flex h-52 w-52 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_0_60px_rgba(239,68,68,0.5)]"
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        >
          <div className="h-full w-full rounded-full bg-red-500/50" />
        </motion.div>

        <svg className="absolute h-full w-full" viewBox="0 0 220 220">
          <motion.circle
            cx="110"
            cy="110"
            r="100"
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="4"
            strokeDasharray="1"
            strokeDashoffset={pathLength}
            transform="rotate(-90 140 140)"
            style={{ pathLength: useMotionValue(0) }}
          />
        </svg>

        <AnimatePresence>
          {isHolding && !isSent && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 rounded-full border-2 border-white/50"
            />
          )}
        </AnimatePresence>
        <div className="relative z-10 flex flex-col items-center justify-center">
          {isSent ? (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold"
            >
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={controls}
                />
              </svg>
            </motion.span>
          ) : isHolding ? (
            <span className="text-6xl font-bold">{countdown}</span>
          ) : (
            <span className="text-6xl font-bold">SOS</span>
          )}
        </div>
      </motion.button>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-300">
        {isSent ? "SOS Signal Sent" : "Press & Hold for 3 Seconds"}
      </p>
      <p className="mt-2 max-w-sm text-center text-xs text-zinc-500">
        Your live location and details will be shared with nearby responders.
      </p>
    </div>
  );
};

const EmergencySOS = () => {
  const [selectedType, setSelectedType] = useState(null);
  const emergencyTypes = [
    { icon: <FaWater />, text: "Flood" },
    { icon: <FaFire />, text: "Fire" }, // Corrected icon
    { icon: <FaExclamationTriangle />, text: "Earthquake" },
    { icon: <FaBuilding />, text: "Building Collapse" },
    { icon: <FaAmbulance />, text: "Medical" }, // Corrected icon
    { icon: <FaCarCrash />, text: "Accident" },
    { icon: <FaWind />, text: "Cyclone" },
    { icon: <FaQuestion />, text: "Other" },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-6 font-sans text-white">
      <div className="mx-auto max-w-7xl">
        {/* Section 5 moved to top */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard title="Live SOS Status">
            <ul className="space-y-4">
              <li className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                  <FiCheckCircle />
                </span>
                <div>
                  <p className="font-semibold">SOS Sent</p>
                  <p className="text-xs text-zinc-400">
                    Request received by control room.
                  </p>
                </div>
              </li>
              <li className="flex items-center gap-4 opacity-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <FiLoader className="animate-spin" />
                </span>
                <div>
                  <p className="font-semibold">Nearest Volunteer Assigned</p>
                  <p className="text-xs text-zinc-400">ETA: 8 minutes</p>
                </div>
              </li>
              <li className="flex items-center gap-4 opacity-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <FiAlertCircle />
                </span>
                <div>
                  <p className="font-semibold">Ambulance Dispatched</p>
                  <p className="text-xs text-zinc-400">ETA: 12 minutes</p>
                </div>
              </li>
            </ul>
          </InfoCard>

          <InfoCard title="Nearby Help">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaHome className="text-zinc-400" /> Shelter
                </div>
                <p>1.3 km</p>
                <button className="text-xs text-blue-400 hover:text-blue-300">
                  Navigate →
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaAmbulance className="text-zinc-400" /> Ambulance
                </div>
                <p>10 min</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaUserFriends className="text-zinc-400" /> Volunteer
                </div>
                <p>700 m</p>
              </div>
            </div>
          </InfoCard>
          <InfoCard title="Emergency Tips">
            <ul className="space-y-2 text-left text-sm text-zinc-300">
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-green-400" /> Stay calm
              </li>
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-green-400" /> Keep phone charged
              </li>
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-green-400" /> Share accurate info
              </li>
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-green-400" /> Follow instructions
              </li>
            </ul>
          </InfoCard>
          <InfoCard title="Current Location">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1 text-sm">
                <p className="text-zinc-300">
                  123, 5th Main, Koramangala, Bengaluru, 560034
                </p>
                <p>
                  <span className="text-zinc-500">Lat:</span> 12.9352
                </p>
                <p>
                  <span className="text-zinc-500">Lon:</span> 77.6245
                </p>
                <p>
                  <span className="text-zinc-500">Accuracy:</span> 5m
                </p>
                <button className="mt-2 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300">
                  <FiRefreshCw /> Refresh Location
                </button>
              </div>
              <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-zinc-800">
                <img
                  src="https://i.imgur.com/gq42a5A.png"
                  alt="Map preview"
                  className="h-full w-full rounded-xl object-cover"
                />
              </div>
            </div>
          </InfoCard>
        </div>

        {/* Main Two-Column Section */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Describe Problem Section */}
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm lg:col-span-3">
            <h3 className="mb-4 text-xl font-semibold">Describe the problem</h3>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-white/5 p-4 text-sm placeholder-zinc-500 focus:border-blue-500/50 focus:ring-blue-500/50"
              rows="4"
              placeholder="For example: 'Trapped under debris', 'Need medical help for an elderly person'..."
            ></textarea>
            <div className="mt-4 grid flex-grow grid-cols-2 justify-end gap-4">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold hover:bg-white/10">
                <FiMic /> Record Voice
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold hover:bg-white/10">
                <FiUpload /> Upload Image
              </button>
              <button className="col-span-2 flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold hover:bg-blue-500">
                Send Details
              </button>
            </div>
          </div>
          {/* SOS Section */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-gradient-to-br from-zinc-900/50 to-red-900/10 p-6 backdrop-blur-sm lg:col-span-2">
            <h3 className="mb-6 text-center text-lg font-semibold">
              Emergency SOS
            </h3>
            <div className="flex w-full items-center justify-center">
              <SOSButton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const InfoCard = ({ title, children }) => (
  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
    <h3 className="mb-4 text-xl font-semibold">{title}</h3>
    {children}
  </div>
);

export default EmergencySOS;
