import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  const layoutStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f0f2f5", // A light grey background
  };

  return (
    <div style={layoutStyle}>
      <Outlet />
    </div>
  );
};

export default AuthLayout;
