import { Link, NavLink } from "react-router-dom";

const Sidebar = () => {
  const sidebarStyle = {
    width: "250px",
    backgroundColor: "#1e293b", // A darker blue-gray
    color: "white",
    padding: "1.5rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  const logoStyle = {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#ffffff",
    textDecoration: "none",
    textAlign: "center",
    marginBottom: "1rem",
  };

  const navStyle = { display: "flex", flexDirection: "column", gap: "0.5rem" };
  const linkStyle = {
    color: "#cbd5e1",
    textDecoration: "none",
    padding: "0.75rem 1rem",
    borderRadius: "6px",
  };

  return (
    <aside style={sidebarStyle}>
      <Link to="/admin" style={logoStyle}>
        AapdaSetu
      </Link>
      <nav style={navStyle}>
        <Link to="/admin" style={linkStyle}>
          Dashboard
        </Link>
        <Link to="/admin/sos-management" style={linkStyle}>
          SOS Management
        </Link>
        <Link to="/admin/volunteers" style={linkStyle}>
          Volunteers
        </Link>
        <Link to="/admin/shelters" style={linkStyle}>
          Shelters
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
