import { motion } from "framer-motion";
const Home = () => {
  const features = [
    {
      icon: "📡",
      title: "Offline P2P Mesh SOS",
      description: "Communicate even without cellular networks.",
    },
    {
      icon: "🧠",
      title: "AI-Powered Triage",
      description: "Automatically classify and prioritize SOS requests.",
    },
    {
      icon: "🗺️",
      title: "Disaster-Aware Routing",
      description: "Navigate around danger zones safely.",
    },
    {
      icon: "🤝",
      title: "Volunteer Coordination",
      description: "Track volunteers, shelters and rescue teams in real time.",
    },
  ];

  return (
    <>
      <style>
        {`
          .pulse-marker > div {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          .leaflet-container { background: #0F0F11; }
        `}
      </style>

      {/* Hero Section */}
      <section
        id="home"
        className="relative flex h-screen items-center justify-center text-center"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-[#0F0F11] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <div className="absolute inset-0 z-10 bg-[url('https://www.transparenttextures.com/patterns/grid.png')] opacity-10"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-20 px-4"
        >
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
            Your Lifeline When It Matters Most
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300">
            AapdaSetu bridges the communication gap during disasters using
            AI-powered coordination, offline SOS messaging, volunteer management
            and intelligent rescue operations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Get Started
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-base font-semibold leading-6 text-white"
            >
              Learn More <span aria-hidden="true">→</span>
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="relative w-full overflow-hidden py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            visible: { opacity: 1, scale: 1 },
            hidden: { opacity: 0, scale: 0.95 },
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-20 mx-auto w-full max-w-5xl rounded-[20px] border border-white/10 bg-black/30 p-8 text-center text-white shadow-2xl backdrop-blur-xl md:p-16"
        >
          <h2 className="text-4xl font-bold md:text-5xl">About AapdaSetu</h2>
          <p className="mt-2 text-lg font-light text-blue-300">
            Connecting Communities. Saving Lives.
          </p>
          <p className="mx-auto mt-8 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-lg">
            AapdaSetu is an AI-powered disaster response platform that bridges
            communication gaps during emergencies. It enables offline SOS
            messaging, intelligent rescue coordination, volunteer management,
            shelter discovery, and real-time situational awareness to help
            communities respond quickly and effectively during natural
            disasters.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-lg">
            Our mission is to build a resilient India where every citizen has
            access to reliable emergency communication and coordinated disaster
            response, powered by AI and modern technology.
          </p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Core Features
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Technology designed to save lives when it matters most.
            </p>
          </div>
          <div className="mt-20 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={{
                  visible: { opacity: 1, y: 0 },
                  hidden: { opacity: 0, y: 20 },
                }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="transform rounded-[20px] border border-white/10 bg-white/5 p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/50 hover:shadow-blue-500/10"
              >
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
