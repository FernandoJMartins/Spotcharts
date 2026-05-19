import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);

      // remove token from URL and navigate home
      try {
        const cleanPath = "/";
        window.history.replaceState({}, document.title, cleanPath);
      } catch (e) {
        // ignore
      }

      navigate("/");
      return;
    }

    navigate("/login");
  }, [navigate]);

  return <div className="p-8 text-center">Conectando...</div>;
}
