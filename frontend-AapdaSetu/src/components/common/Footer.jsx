import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-zinc-950 text-zinc-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <h3 className="text-xl font-bold text-white">AapdaSetu</h3>
          <p className="mt-2 text-sm">Connecting Communities. Saving Lives.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/about" className="hover:text-white">
                About
              </Link>
            </li>
            <li>
              <Link to="/features" className="hover:text-white">
                Features
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white">Services</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/sos" className="hover:text-white">
                Emergency SOS
              </Link>
            </li>
            <li>
              <Link to="/volunteer" className="hover:text-white">
                Volunteer Portal
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-white">
                Admin Dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white">Contact</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>contact@aapda.gov.in</li>
            <li>+91-11-2345-6789</li>
          </ul>
        </div>
      </div>
      <div className="mt-8 border-t border-zinc-800 pt-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} AapdaSetu. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
