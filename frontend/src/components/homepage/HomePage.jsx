import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Zap, LogOut } from "lucide-react";
import { withApiBase } from "../../utils/apiBase";
import { apiFetch } from "../../utils/appClient";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();


useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    setLoading(false);
    return;
  }

  const checkAuth = async () => {
    try {
      const res = await apiFetch("/api/auth/me/");

      if (!res.ok) {
        // localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const data = await res.json();
      setIsAuthenticated(true);
      setUser(data);

    } catch (error) {
      console.error("Auth check error:", error);
      // localStorage.removeItem("token");
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  checkAuth();
}, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      await apiFetch("/api/auth/logout/", {
  method: "POST",
});
    } catch (error) {
      console.error(error);
    }

    localStorage.removeItem("token");

    setIsAuthenticated(false);
    setUser(null);

    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-elevated)]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 mb-4">
            <div className="w-8 h-8 border-3 border-[var(--color-spotify-green)] border-t-transparent rounded-full animate-spin"></div>
          </div>

          <p className="text-[var(--color-text-secondary)]">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  // ================= LOGADO =================
  if (isAuthenticated && user) {
    return (
      <div className="page-bg bg-[var(--color-bg-elevated)] min-h-screen py-20 px-4">
        <div className="hero-ornaments" aria-hidden="true">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-grid" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          {/* Header */}
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 mb-12">
            <div className="flex flex-col items-center">
              <h1
                className="text-5xl font-extrabold mb-2 reveal"
                style={{ "--delay": "0.05s" }}
              >
                Bem-vindo,{" "}
                <span className="text-[var(--color-spotify-green)] glow-text">
                  {user.display_name}
                </span>
              </h1>

              <p className="text-[var(--color-text-secondary)] text-lg">
                Spotify ID:{" "}
                <span className="font-mono text-sm">
                  {user.spotify_id}
                </span>
              </p>

              {user.email && (
                <p className="text-[var(--color-text-secondary)] text-lg mt-1">
                  {user.email}
                </p>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2 px-6 py-3 reveal"
              style={{ "--delay": "0.12s" }}
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>

          {/* Cards */}
          <div className="w-full max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-12 justify-items-center">
            {/* Perfil */}
            <div
              className="card reveal-scale w-full max-w-sm"
              style={{ "--delay": "0.12s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Perfil
                </h3>

                <div className="w-10 h-10 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                  <BarChart3
                    className="text-[var(--color-spotify-green)]"
                    size={20}
                  />
                </div>
              </div>

              <p className="text-3xl font-bold mb-2">
                {user.display_name}
              </p>

              <p className="text-[var(--color-text-secondary)] text-sm">
                Conta Spotify ativa
              </p>
            </div>

            {/* Tracks */}
            <div
              className="card cursor-pointer hover:border-[var(--color-spotify-green)] transition-colors reveal-scale w-full max-w-sm"
              style={{ "--delay": "0.2s" }}
              onClick={() => navigate("/graficos")}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Top Faixas
                </h3>

                <div className="w-10 h-10 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                  <TrendingUp
                    className="text-[var(--color-spotify-green)]"
                    size={20}
                  />
                </div>
              </div>

              <p className="text-3xl font-bold mb-2">
                Visualizar
              </p>

              <p className="text-[var(--color-text-secondary)] text-sm">
                Suas músicas mais ouvidas
              </p>
            </div>

            {/* Sync */}
            <div
              className="card reveal-scale w-full max-w-sm"
              style={{ "--delay": "0.28s" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Sincronização
                </h3>

                <div className="w-10 h-10 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                  <Zap
                    className="text-[var(--color-spotify-green)]"
                    size={20}
                  />
                </div>
              </div>

              <p className="text-3xl font-bold mb-2">
                {user.last_sync ? "✓" : "−"}
              </p>

              <p className="text-[var(--color-text-secondary)] text-sm">
                {user.last_sync
                  ? `Última atualização: ${new Date(
                      user.last_sync
                    ).toLocaleDateString("pt-BR")}`
                  : "Nunca sincronizado"}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div
            className="w-full max-w-4xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-8 text-center reveal"
            style={{ "--delay": "0.35s" }}
          >
            <h2 className="text-3xl font-bold mb-4">
              Pronto para explorar?
            </h2>

            <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
              Visualize seus top tracks, artistas, tendências e
              muito mais em gráficos interativos.
            </p>

            <button
              onClick={() => navigate("/graficos")}
              className="btn-primary px-8 py-4 text-lg"
            >
              Ver Gráficos →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= NÃO LOGADO =================
  return (
    <div className="page-bg bg-[var(--color-bg-elevated)] min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-20">
        <div className="hero-ornaments" aria-hidden="true">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-grid" />
        </div>

        <div className="max-w-2xl w-full text-center relative z-10">
          <h1 className="text-7xl font-extrabold mb-6 leading-tight reveal">
            Seus dados
            <br />

            <span className="text-[var(--color-spotify-green)] glow-text">
              com clareza visual.
            </span>
          </h1>

          <p
            className="text-xl text-[var(--color-text-secondary)] mb-8 leading-relaxed reveal"
            style={{ "--delay": "0.08s" }}
          >
            Conecte sua conta Spotify e transforme seus top
            tracks, artistas e tendências em visualizações
            impressionantes.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center reveal"
            style={{ "--delay": "0.16s" }}
          >
            <button
              onClick={() => navigate("/login")}
              className="btn-primary px-8 py-4 text-lg"
            >
              Começar Agora
            </button>

            <a
              href="#features"
              className="btn-secondary px-8 py-4 text-lg"
            >
              Ver Features ↓
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg mx-4 p-20"
      >
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-5xl font-bold text-center mb-16 reveal"
            style={{ "--delay": "0.05s" }}
          >
            Recursos Principais
          </h2>

          <div className="flex gap-8">
            {[
              {
                icon: BarChart3,
                title: "Visualizações Poderosas",
                description:
                  "Gráficos de barras, linhas, donuts e mais.",
              },
              {
                icon: TrendingUp,
                title: "Análise Temporal",
                description:
                  "Acompanhe suas preferências musicais.",
              },
              {
                icon: Zap,
                title: "Rápido & Elegante",
                description:
                  "Interface limpa, escura e responsiva.",
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;

              return (
                <div
                  key={idx}
                  className="card reveal-scale"
                  style={{
                    "--delay": `${0.1 + idx * 0.08}s`,
                  }}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--color-spotify-green)] bg-opacity-20 mb-4">
                    <Icon
                      className="text-[var(--color-spotify-green)]"
                      size={24}
                    />
                  </div>

                  <h3 className="text-xl font-bold mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-[var(--color-text-secondary)]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--color-bg-elevated)] py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-4xl font-bold mb-6 reveal"
            style={{ "--delay": "0.05s" }}
          >
            Pronto para explorar seus dados?
          </h2>

          <p
            className="text-lg text-[var(--color-text-secondary)] mb-8 reveal"
            style={{ "--delay": "0.12s" }}
          >
            Conecte com Spotify e comece agora.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="btn-primary px-8 py-4 text-lg reveal"
            style={{ "--delay": "0.2s" }}
          >
            Conectar com Spotify
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-subtle)] py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-[var(--color-text-secondary)]">
          <p>
            SpotifyCharts © 2026 • Dados & Visualizações
            Musicais
          </p>
        </div>
      </footer>
    </div>
  );
}