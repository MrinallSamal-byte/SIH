import {
  FiPhone,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiMessageSquare,
  FiShare2,
  FiCopy,
} from "react-icons/fi";
import {
  FaBullhorn,
  FaAmbulance,
  FaFireExtinguisher,
  FaShieldAlt,
  FaUserFriends,
  FaHospital,
  FaWarehouse,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const ServiceCard = ({ icon, name, number }) => (
  <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 text-center backdrop-blur-sm">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-2xl text-blue-400">
      {icon}
    </div>
    <h3 className="font-semibold">{name}</h3>
    <p className="text-sm text-zinc-400">{number}</p>
    <button className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold hover:bg-blue-500">
      Call Now
    </button>
  </div>
);

const PersonalContactCard = ({ photo, name, relationship }) => (
  <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 backdrop-blur-sm">
    <div className="flex items-center gap-4">
      <img
        src={photo}
        alt={name}
        className="h-12 w-12 rounded-full object-cover"
      />
      <div>
        <h4 className="font-semibold">{name}</h4>
        <p className="text-xs text-zinc-400">{relationship}</p>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2">
      <button className="rounded-md bg-white/10 p-2 text-sm hover:bg-white/20">
        <FiPhone className="mx-auto" />
      </button>
      <button className="rounded-md bg-white/10 p-2 text-sm hover:bg-white/20">
        <FiMessageSquare className="mx-auto" />
      </button>
      <button className="rounded-md bg-white/10 p-2 text-sm hover:bg-white/20">
        <FiShare2 className="mx-auto" />
      </button>
    </div>
  </div>
);

const EmergencyContactsDashboard = () => {
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
            <FiPhone className="text-blue-500" />
            Emergency Contacts
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Quickly connect with emergency services, family members, and
            disaster response authorities.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <FiMapPin /> Bengaluru, Karnataka
            </span>
            <span className="flex items-center gap-2 text-green-400">
              <FiCheckCircle /> Network Available
            </span>
            <span>🕒 Last Updated: 2 minutes ago</span>
          </div>
        </div>

        {/* Top Section */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* SOS Shortcut */}
          <div className="rounded-2xl border border-red-500/20 bg-red-900/20 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-4xl text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500"
              >
                <FaBullhorn />
              </motion.button>
              <h2 className="mt-4 text-xl font-semibold">Emergency SOS</h2>
              <p className="mt-1 text-sm text-red-200">
                Immediately notify rescue teams with your live location.
              </p>
            </div>
          </div>

          {/* Quick Message */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold">
              Quick Emergency Message
            </h3>
            <p className="mb-4 rounded-lg bg-white/5 p-3 text-sm text-zinc-300">
              "I am in an emergency. This is my current location. Please send
              help immediately."
            </p>
            <div className="space-y-2">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2 text-xs font-semibold hover:bg-white/20">
                <FiCopy /> Copy Message
              </button>
              <button className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold hover:bg-blue-500">
                Send to All Contacts
              </button>
            </div>
          </div>
        </div>

        {/* Official Services */}
        <div>
          <h2 className="mb-4 text-xl font-bold">
            Official Emergency Services
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ServiceCard icon={<FaShieldAlt />} name="Police" number="100" />
            <ServiceCard icon={<FaAmbulance />} name="Ambulance" number="108" />
            <ServiceCard
              icon={<FaFireExtinguisher />}
              name="Fire Department"
              number="101"
            />
            <ServiceCard
              icon={<FaWarehouse />}
              name="Disaster Authority"
              number="1077"
            />
          </div>
        </div>

        {/* Personal Contacts */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Personal Emergency Contacts</h2>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
              + Add Contact
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <PersonalContactCard
              photo="https://i.pravatar.cc/80?u=jane"
              name="Jane Doe"
              relationship="Spouse"
            />
            <PersonalContactCard
              photo="https://i.pravatar.cc/80?u=mike"
              name="Mike Doe"
              relationship="Brother"
            />
            <PersonalContactCard
              photo="https://i.pravatar.cc/80?u=emily"
              name="Dr. Emily"
              relationship="Doctor"
            />
          </div>
        </div>

        {/* Family Safety & Nearby Centers */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">Family Safety Group</h3>
            <div className="space-y-4">
              <FamilyMember
                name="Jane Doe"
                status="Safe"
                lastSeen="5m ago"
                color="green"
              />
              <FamilyMember
                name="Mike Doe"
                status="Low Battery"
                lastSeen="1h ago"
                color="yellow"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold">
              Nearest Response Centers
            </h3>
            <div className="space-y-4">
              <Center
                icon={<FaHospital />}
                name="City Hospital"
                distance="3.2 km"
              />
              <Center
                icon={<FaShieldAlt />}
                name="Police Station"
                distance="2.8 km"
              />
              <Center
                icon={<FaWarehouse />}
                name="Emergency Shelter"
                distance="1.5 km"
              />
            </div>
          </div>
        </div>

        {/* Bottom Map */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Emergency Resources Map</h2>
          <div className="h-[400px] w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-2 backdrop-blur-sm">
            <div ref={mapRef} className="h-full w-full rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
};

const FamilyMember = ({ name, status, lastSeen, color }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-semibold">{name}</p>
      <p className={`text-xs text-${color}-400`}>
        {status} • {lastSeen}
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
);

const Center = ({ icon, name, distance }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="text-xl text-blue-400">{icon}</div>
      <p className="text-sm font-semibold">{name}</p>
    </div>
    <div className="flex items-center gap-4">
      <p className="text-sm text-zinc-400">{distance}</p>
      <button className="text-xs font-semibold text-blue-400 hover:text-blue-300">
        Navigate
      </button>
    </div>
  </div>
);

export default EmergencyContactsDashboard;
