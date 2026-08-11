import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiChevronDown,
  FiCompass,
  FiCloudRain,
  FiHome,
  FiMapPin,
  FiPhone,
  FiSearch,
  FiSettings,
  FiShield,
  FiSun,
  FiUser,
} from "react-icons/fi";
import {
  FaHouseDamage,
  FaUserShield,
  FaRoute,
  FaFirstAid,
  FaBullhorn,
  FaUserFriends,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const SidebarLink = ({ icon, text, active, path = "#", indicator }) => (
  <Link
    to={path}
    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-zinc-800 text-white"
        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
    }`}
  >
    {icon}
    <span>{text}</span>
    {indicator === "red" && (
      <div className="ml-auto h-2 w-2 rounded-full bg-red-500" />
    )}
  </Link>
);

const AlertItem = ({ severity, title, time }) => {
  const severityStyles = {
    critical: {
      icon: <FiAlertTriangle />,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    high: {
      icon: <FiAlertTriangle />,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    medium: {
      icon: <FiCloudRain />,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
  };
  const style = severityStyles[severity];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-zinc-800/50 ${style.bg}`}
    >
      <div className={`mt-1 text-lg ${style.color}`}>{style.icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-zinc-400">{time}</p>
      </div>
      <button className="self-center text-xs text-blue-400 hover:text-blue-300">
        Details
      </button>
    </div>
  );
};

const CitizenLayout = () => {
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const hasNewAlerts = true; // This would be dynamic

  const sidebarNav = [
    {
      title: "Dashboard",
      links: [
        { icon: <FiHome />, text: "Home", path: "/dashboard" },
        {
          icon: <FaBullhorn />,
          text: "Emergency SOS",
          path: "/emergency-sos",
          indicator: "red",
        },
        {
          icon: <FiBell />,
          text: "Disaster Alerts",
          path: "/disaster-alerts",
        },
      ],
    },
    {
      title: "Safety",
      links: [
        {
          icon: <FiShield />,
          text: "Safety",
          path: "/safety",
          indicator: "green",
        },
        { icon: <FaRoute />, text: "Safe Routes", path: "/safe-routes" },
        {
          icon: <FaFirstAid />,
          text: "Medical Assistance",
          path: "/medical-assistance",
        },
      ],
    },
    {
      title: "Community",
      links: [
        {
          icon: <FaHouseDamage />,
          text: "Report Damage",
          path: "/report-damage",
        },
        {
          icon: <FiSearch className="text-blue-400" />,
          text: "Missing Persons",
          path: "/missing-persons",
        },
        {
          icon: <FaUserFriends />,
          text: "Emergency Contacts",
          path: "/emergency-contacts",
        },
      ],
    },
  ];

  const alerts = [
    {
      severity: "critical",
      title: "Flood Warning: River approaching danger level.",
      time: "2m ago",
    },
    {
      severity: "high",
      title: "Heavy Rain Alert: Waterlogging expected in low-lying areas.",
      time: "15m ago",
    },
    {
      severity: "medium",
      title: "Road Closure: Main street blocked due to fallen tree.",
      time: "30m ago",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0B0B0D] font-sans text-white">
      {/* Left Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-white/10 bg-black/50 p-4 lg:flex">
        <div className="mb-8 flex items-center gap-2 text-xl font-bold">
          <FaUserShield className="text-blue-500" />
          <span>AapdaSetu</span>
        </div>
        <nav className="flex flex-1 flex-col gap-6">
          {sidebarNav.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 px-3 text-xs font-semibold uppercase text-zinc-500">
                {group.title}
              </h3>
              <div className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <SidebarLink
                    key={link.text}
                    {...link}
                    active={location.pathname === link.path}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto">
          <SidebarLink icon={<FiSettings />} text="Settings" path="#" />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Top Navbar from CitizenDashboard */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/30 px-4 backdrop-blur-lg sm:px-8">
          <div className="flex items-center gap-4 text-sm">
            <FiMapPin className="text-zinc-400" />
            <span className="text-zinc-300">Bengaluru, Karnataka</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative text-zinc-400 hover:text-white"
              >
                <FiBell size={20} />
                {hasNewAlerts && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-4 w-80 origin-top-right rounded-2xl border border-white/10 bg-zinc-900/80 p-2 shadow-lg backdrop-blur-md"
                  >
                    <div className="p-2">
                      <h3 className="font-semibold">Live Disaster Alerts</h3>
                    </div>
                    <div className="space-y-2">
                      {alerts.map((alert, i) => (
                        <AlertItem key={i} {...alert} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2">
              <img
                src="https://i.pravatar.cc/40?u=john"
                alt="User avatar"
                className="h-8 w-8 rounded-full"
              />
              <span className="hidden text-sm font-medium sm:inline">
                John Doe
              </span>
              <FiChevronDown className="text-zinc-500" />
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
};

export default CitizenLayout;
