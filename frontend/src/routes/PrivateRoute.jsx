import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { api } from "../utils/apiBase";

export default function PrivateRoute({
  children,
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const res = await api.get("/api/auth/me/");

        setIsAuthenticated(res.status === 200);

      } catch (error) {
        console.error("Auth check error:", error);

        localStorage.removeItem("token");

        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}