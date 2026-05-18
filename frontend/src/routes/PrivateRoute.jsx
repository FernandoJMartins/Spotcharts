
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { withApiBase } from "../utils/apiBase";

export default function PrivateRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica se o usuário está autenticado chamando /api/auth/me/
    // Executa apenas uma vez quando monta
    const checkAuth = async () => {
      try {
        const res = await fetch(withApiBase("/api/auth/me/"), {
          credentials: "include",
        });
        setIsAuthenticated(res.ok);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // Dependência vazia = executa uma vez

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}