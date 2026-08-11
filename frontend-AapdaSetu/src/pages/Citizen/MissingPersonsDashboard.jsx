import {
  FiSearch,
  FiMapPin,
  FiClock,
  FiFilter,
  FiUserPlus,
  FiUserCheck,
  FiCheckCircle,
  FiUpload,
  FiShare2,
} from "react-icons/fi";
import {
  FaUser,
  FaVenusMars,
  FaRulerVertical,
  FaWeight,
  FaTshirt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const ActionCard = ({ icon, title, description }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="cursor-pointer rounded-2xl border border-white/10 bg-zinc-900/50 p-6 text-center backdrop-blur-sm transition-colors hover:border-blue-500/50"
  >
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-3xl text-blue-400">
      {icon}
    </div>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="mt-1 text-sm text-zinc-400">{description}</p>
  </motion.div>
);

const MissingPersonCard = ({ photo, name, age, gender, lastSeen, status }) => {
  const statusStyles = {
    Missing: "bg-red-500/20 text-red-400",
    "Search In Progress": "bg-yellow-500/20 text-yellow-400",
    "Found Safe": "bg-green-500/20 text-green-400",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm">
      <img src={photo} alt={name} className="h-48 w-full object-cover" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{name}</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyles[status]}`}
          >
            {status}
          </span>
        </div>
        <p className="text-sm text-zinc-400">
          {age}, {gender}
        </p>
        <p className="mt-2 text-xs text-zinc-500">Last seen: {lastSeen}</p>
        <div className="mt-4 flex gap-3">
          <button className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold hover:bg-white/20">
            View Details
          </button>
          <button className="rounded-lg bg-white/10 p-2 text-xs font-semibold hover:bg-white/20">
            <FiShare2 />
          </button>
        </div>
      </div>
    </div>
  );
};

const MissingPersonsDashboard = () => {
  const mapRef = useRef(null);

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
            <FiSearch className="text-blue-500" />
            Missing Persons
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Report missing individuals, search verified records, and help
            reunite families during emergencies.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <FiMapPin /> Bengaluru, Karnataka
            </span>
            <span>🕒 Last Updated: 2 minutes ago</span>
            <span className="flex items-center gap-2 text-green-400">
              <FiCheckCircle /> Disaster Response Network Active
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ActionCard
            icon={<FiUserPlus />}
            title="Report Missing Person"
            description="File a new report for a missing individual."
          />
          <ActionCard
            icon={<FiUserCheck />}
            title="Report Found Person"
            description="Report a person you have found who may be missing."
          />
        </div>

        {/* Search Section */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-grow">
              <FiSearch className="absolute left-4 top-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by Name, Age, Location or Report ID"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-12 pr-4 placeholder-zinc-500 focus:border-blue-500/50 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20">
                <FiFilter /> Filters
              </button>
              <button className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500">
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Recent Missing Persons */}
        <div>
          <h2 className="mb-4 text-xl font-bold">Recent Missing Persons</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MissingPersonCard
              photo="https://i.pravatar.cc/300?u=a"
              name="Riya Sharma"
              age="28"
              gender="Female"
              lastSeen="Koramangala"
              status="Missing"
            />
            <MissingPersonCard
              photo="https://i.pravatar.cc/300?u=b"
              name="Amit Kumar"
              age="45"
              gender="Male"
              lastSeen="Whitefield"
              status="Search In Progress"
            />
            <MissingPersonCard
              photo="https://i.pravatar.cc/300?u=c"
              name="Priya Singh"
              age="8"
              gender="Female"
              lastSeen="HSR Layout"
              status="Found Safe"
            />
            <MissingPersonCard
              photo="https://i.pravatar.cc/300?u=d"
              name="Rohan Verma"
              age="19"
              gender="Male"
              lastSeen="Indiranagar"
              status="Missing"
            />
          </div>
        </div>

        {/* Map & Report Form */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Interactive Map */}
          <div className="h-[500px] w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
          </div>

          {/* Report Form */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-bold">Report a Missing Person</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Full Name" id="full-name" />
                <InputField label="Age" id="age" type="number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Gender"
                  id="gender"
                  options={["Male", "Female", "Other"]}
                />
                <InputField label="Last Seen Location" id="last-seen" />
              </div>
              <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-6 text-center">
                <FiUpload className="mx-auto mb-2 text-3xl text-zinc-400" />
                <p className="text-sm font-semibold">Upload Photo</p>
                <p className="text-xs text-zinc-500">
                  A clear, recent photo is crucial.
                </p>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-500"
              >
                Submit Report
              </button>
            </form>
          </div>
        </div>

        {/* AI Match Suggestions & Community Sightings */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">AI Match Suggestions</h3>
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div className="flex items-center gap-4">
                <img
                  src="https://i.pravatar.cc/64?u=match"
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">Possible Match</p>
                  <p className="text-sm text-green-400">92% Similarity</p>
                  <p className="text-xs text-zinc-400">
                    Seen near Relief Camp A
                  </p>
                </div>
              </div>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
                View
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Community Sightings</h3>
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div>
                <p className="font-semibold">Possible Sighting Reported</p>
                <p className="text-xs text-zinc-400">
                  Location: MG Road • Time: 25m ago
                </p>
              </div>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
                View
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const InputField = ({ label, id, type = "text" }) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1 block text-xs font-medium text-zinc-400"
    >
      {label}
    </label>
    <input
      type={type}
      id={id}
      className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm focus:border-blue-500/50 focus:ring-blue-500/50"
    />
  </div>
);

const SelectField = ({ label, id, options }) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1 block text-xs font-medium text-zinc-400"
    >
      {label}
    </label>
    <select
      id={id}
      className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm focus:border-blue-500/50 focus:ring-blue-500/50"
    >
      {options.map((opt) => (
        <option key={opt} className="bg-zinc-800">
          {opt}
        </option>
      ))}
    </select>
  </div>
);

export default MissingPersonsDashboard;
