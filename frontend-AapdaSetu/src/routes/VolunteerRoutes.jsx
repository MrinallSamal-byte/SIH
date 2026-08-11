import { Navigate, Outlet } from "react-router-dom";

/**
 * A placeholder hook for authentication logic.
 * In a real application, this would check a context, Redux store, or an API.
 * @returns {{isAuthenticated: boolean, userRole: string}}
 */
const useAuth = () => {
  // --- FOR DEMONSTRATION PURPOSES ---
  // Change `isAuthenticated` to `false` to test the redirect to /login.
  const isAuthenticated = true;
  const userRole = "volunteer";

  return { isAuthenticated, userRole };
};

const VolunteerRoutes = () => {
  const { isAuthenticated, userRole } = useAuth();

  // If the user is authenticated and has the 'volunteer' role, render the nested routes.
  // Otherwise, redirect them to the login page.
  return isAuthenticated && userRole === "volunteer" ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
};

export default VolunteerRoutes;
