import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { withApiBase } from "../../utils/apiBase";
import { notifyAuthChanged, apiFetch } from "../../utils/appClient";
import { useState } from "react";

export default function Login() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const handleSpotifyLogin = () => {
    window.location.href = withApiBase("/api/auth/login/");
  };

  const handleGuestLogin = async () => {
    try {
      const resp = await apiFetch("/api/auth/guest/", {
        method: "POST",
      });

      if (!resp.ok) {
        throw new Error("guest_login_failed");
      }

      const data = await resp.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        notifyAuthChanged();
        navigate("/");
      }
      if (!data.token) {
        throw new Error("missing_token");
      }

      localStorage.setItem("token", data.token);
      console.log(data.token)
      console.log(localStorage.getItem("token"))
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        
        if (!token) {
          setIsAuthenticated(false);
          return;
        }
        
        const res = await apiFetch("/api/auth/me/");
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setIsAuthenticated(true);
          navigate("/");
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem("token");
        }
      } catch {
        setIsAuthenticated(false);
        localStorage.removeItem("token");
      }
    };

    checkAuth();
    window.addEventListener("authChanged", checkAuth);
    return () => window.removeEventListener("authChanged", checkAuth);
  }, [navigate]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="page-bg flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg-elevated)] gap-[var(--spacing-2xl)]">
      <div className="hero-ornaments" aria-hidden="true">
        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
        <div className="hero-grid" />
      </div>

      <div className="flex flex-col items-center gap-[var(--spacing-lg)] max-w-xl text-center relative z-10">
        <div className="text-[var(--color-spotify-green)] font-semibold text-sm tracking-widest reveal">
          ● SPOTIFYCHARTS
        </div>

        <h1
          className="text-6xl font-extrabold leading-tight reveal"
          style={{ "--delay": "0.06s" }}
        >
          Dados musicais
          <br />
          <span className="text-[var(--color-spotify-green)] glow-text">
            com clareza visual.
          </span>
        </h1>

        <p
          className="text-[var(--color-text-secondary)] text-lg leading-relaxed max-w-md reveal"
          style={{ "--delay": "0.12s" }}
        >
          Transforme seus dados do Spotify em gráficos e visualizações
          impressionantes. Analise seus top tracks, artistas e tendências
          com máxima legibilidade.
        </p>

        <div
          className="flex gap-[var(--spacing-md)] mt-[var(--spacing-xl)] reveal flex-wrap justify-center"
          style={{ "--delay": "0.18s" }}
        >
          <button
            onClick={handleSpotifyLogin}
            className="btn-primary px-8 py-3 text-lg"
          >
            ▶ Conectar com Spotify
          </button>

          <button
            onClick={handleGuestLogin}
            className="btn-secondary px-8 py-3 text-lg"
          >
            Entrar como guest
          </button>
        </div>
      </div>

      <div
        className="absolute bottom-[var(--spacing-xl)] text-center text-[var(--color-text-secondary)] text-sm reveal"
        style={{ "--delay": "0.3s" }}
      >
        <p>SpotifyCharts © 2026 • Dados & Visualizações</p>
      </div>
    </div>
  );
}