import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar.jsx";

const AdminLayout = () => {
  // Basic styling for the layout
  const layoutStyle = {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f4f7f6",
  };

  const contentStyle = {
    flex: 1,
    padding: "2rem",
    overflowY: "auto",
    width: "100%",
  };

  return (
    <div style={layoutStyle}>
      <Navbar />
      <main style={contentStyle}>
        {/* Child routes will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
