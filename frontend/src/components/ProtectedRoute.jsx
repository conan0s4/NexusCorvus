import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../api/authApi";

function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        await getCurrentUser();
        setAuthenticated(true);
      } catch (error) {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;