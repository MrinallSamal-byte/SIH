import { Link as RouterLink } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import { motion } from "framer-motion";

const Navbar = () => {
  const navLinks = ["Home", "About", "Features", "Contact"];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 flex items-center justify-between bg-black/30 px-4 py-3 shadow-lg backdrop-blur-lg md:px-8"
    >
      <RouterLink to="/" className="text-2xl font-bold text-white no-underline">
        AapdaSetu
      </RouterLink>

      <nav className="hidden items-center gap-8 md:flex">
        {navLinks.map((link) => (
          <ScrollLink
            key={link}
            to={link.toLowerCase()}
            smooth={true}
            duration={500}
            spy={true}
            offset={-80}
            className="cursor-pointer text-base font-medium text-zinc-300 no-underline transition-colors hover:text-white"
          >
            {link}
          </ScrollLink>
        ))}
      </nav>

      <div className="flex items-center gap-4" />
    </motion.header>
  );
};

export default Navbar;
