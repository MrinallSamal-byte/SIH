import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import {
  FaHeart,
  FaBolt,
  FaUsers,
  FaShieldAlt,
  FaWifi,
  FaBrain,
  FaRoute,
  FaHandshake,
} from "react-icons/fa";

const About = () => {
  const whyAapdaSetu = [
    {
      icon: <FaWifi className="rotate-45" />,
      title: "Offline Mesh Communication",
      text: "Our platform creates a peer-to-peer mesh network, enabling critical SOS messaging and location sharing even when cellular networks are down.",
    },
    {
      icon: <FaBrain />,
      title: "AI Emergency Prioritization",
      text: "An intelligent triage system analyzes incoming distress signals to prioritize the most urgent cases, ensuring help is directed where it's needed most.",
    },
    {
      icon: <FaRoute />,
      title: "Disaster-Aware Routing",
      text: "We provide safe navigation routes for rescue teams and volunteers by analyzing real-time data to avoid blocked roads, floods, and other hazards.",
    },
    {
      icon: <FaHandshake />,
      title: "Volunteer Coordination",
      text: "A centralized dashboard allows authorities to efficiently manage and dispatch verified volunteers, tracking resources and team locations in real-time.",
    },
  ];

  const coreValues = [
    {
      icon: <FaHeart />,
      title: "Human First",
      text: "Every decision prioritizes saving lives.",
    },
    {
      icon: <FaBolt />,
      title: "Rapid Response",
      text: "Fast communication during emergencies.",
    },
    {
      icon: <FaUsers />,
      title: "Community Collaboration",
      text: "Citizens, volunteers, and authorities work together.",
    },
    {
      icon: <FaShieldAlt />,
      title: "Reliable Technology",
      text: "Offline-first architecture designed for disasters.",
    },
  ];

  return (
    <>
      {/* 1. About AapdaSetu */}
      <section className="relative flex w-full items-center justify-center overflow-hidden py-24 md:py-32">
        {/* The map background is now in MainLayout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-20 mx-4 w-full max-w-4xl rounded-2xl border border-white/10 bg-black/40 p-8 text-center shadow-2xl backdrop-blur-lg md:p-12"
        >
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            About AapdaSetu
          </h1>
          <p className="mt-4 text-lg text-blue-300">
            Connecting Communities. Saving Lives.
          </p>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-lg">
            AapdaSetu is an AI-powered disaster management platform built to
            strengthen emergency response during natural disasters. It bridges
            communication gaps through offline SOS messaging, intelligent rescue
            coordination, and real-time situational awareness.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-lg">
            By combining AI with resilient communication technology, our system
            empowers communities, volunteers, and authorities to collaborate
            seamlessly, ensuring that help arrives faster and more efficiently
            when every second matters.
          </p>
        </motion.div>
      </section>

      {/* 2. Our Mission */}
      <section className="bg-black/20 py-24 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our Mission
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              To empower communities with intelligent disaster response
              technology that enables faster communication, efficient rescue
              coordination, and reliable emergency assistance, even when
              traditional networks fail.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3. Our Vision */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our Vision
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              To build a resilient India where every citizen has access to
              reliable emergency communication and coordinated disaster
              response, powered by AI and modern technology, creating a safer
              future for all.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 4. Why AapdaSetu */}
      <section className="bg-black/20 py-24 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Why AapdaSetu
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {whyAapdaSetu.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-xl border border-white/10 bg-black/30 p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-2xl text-blue-400">
                  {item.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Core Values */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Our Core Values
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {coreValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-xl border border-white/10 bg-white/5 p-8 shadow-lg"
              >
                <div className="text-3xl text-blue-400">{value.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{value.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Closing Quote */}
      <section className="bg-black/20 py-24 px-4 sm:px-6 lg:px-8 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-2xl font-medium italic text-zinc-300 md:text-3xl">
            "Technology becomes meaningful when it helps save lives."
          </p>
        </motion.div>
      </section>
    </>
  );
};

export default About;
