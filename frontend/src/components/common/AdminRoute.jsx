import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const AdminRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <p className="text-center text-slate-300">Checking admin access...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <p className="text-center text-rose-300">Admin access required for scanner operations.</p>;
  }

  return children;
};

export default AdminRoute;
