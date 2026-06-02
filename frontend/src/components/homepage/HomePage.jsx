import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Zap, ArrowUpRight } from "lucide-react";
import { withApiBase } from "../../utils/apiBase";
import './home.css'
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
        const res = await fetch(withApiBase("/api/auth/me/"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.removeItem("token");
          setIsAuthenticated(false);
          setUser(null);
          return;
        }

        const data = await res.json();

        setIsAuthenticated(true);
        setUser(data);
      } catch (error) {
        console.error("Auth check error:", error);

        localStorage.removeItem("token");
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
      await fetch(withApiBase("/api/auth/logout/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    <>
      <div className="sp-root">
        {/* bg effects */}
        <div className="sp-orb sp-orb-1" aria-hidden="true" />
        <div className="sp-orb sp-orb-2" aria-hidden="true" />
        <div className="sp-noise"         aria-hidden="true" />
 
        <div className="sp-inner">
          {/* header */}
          <div className="sp-eyebrow" aria-hidden="true">
            <span className="sp-eyebrow-dot" />
            <span className="sp-eyebrow-label">Spotify conectado</span>
          </div>
 
          <h1 className="sp-headline">
            Olá,{" "}
            <span className="sp-headline-muted">
              {user.display_name}
            </span>
          </h1>
          <p className="sp-subline">
            Tudo pronto para explorar sua música
          </p>
 
          {/* cards */}
          <div className="sp-cards">
            {/* Perfil */}
            <div className="sp-card">
              <div className="sp-card-header">
                <span className="sp-card-label">Perfil</span>
                <div className="sp-icon-wrap">
                  <BarChart3 size={16} />
                </div>
              </div>
              <p className="sp-card-value">{user.display_name}</p>
              <p className="sp-card-desc">Conta Spotify ativa</p>
            </div>
 
            {/* Top Tracks */}
            <div
              className="sp-card sp-clickable"
              onClick={() => navigate("/graficos")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/graficos")}
            >
              <div className="sp-card-header">
                <span className="sp-card-label">Top Faixas</span>
                <div className="sp-icon-wrap">
                  <TrendingUp size={16} />
                </div>
              </div>
              <p className="sp-card-value">Visualizar</p>
              <p className="sp-card-desc">Suas músicas mais ouvidas</p>
              <span className="sp-card-arrow" aria-hidden="true">
                <ArrowUpRight size={18} />
              </span>
            </div>
 
            {/* Sync */}
            <div className="sp-card">
              <div className="sp-card-header">
                <span className="sp-card-label">Sincronização</span>
                <div className="sp-icon-wrap">
                  <Zap size={16} />
                </div>
              </div>
              <p className={`sp-card-value${user.last_sync ? " sp-green" : ""}`}>
                {user.last_sync ? "✓ Sincronizado" : "—"}
              </p>
              <p className="sp-card-desc">
                {user.last_sync
                  ? `Última atualização: ${new Date(user.last_sync).toLocaleDateString("pt-BR")}`
                  : "Nunca sincronizado"}
              </p>
            </div>
          </div>
 
          {/* CTA */}
          <div className="sp-cta">
            <div className="sp-cta-deco" aria-hidden="true" />
            <div className="sp-cta-text">
              <h2>Pronto para explorar?</h2>
              <p>
                Visualize seus top tracks, artistas, tendências e muito
                mais em gráficos interativos.
              </p>
            </div>
            <button className="sp-btn" onClick={() => navigate("/graficos")}>
              Ver Gráficos →
            </button>
          </div>
        </div>
      </div>
    </>
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
        className=" mx-4 p-20"
      >
        <div className="mx-auto">
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
                  "Interface moderna e responsiva.",
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;

              return (
                <div
                  key={idx}
                  className="card2 reveal-scale"
                  style={{
                    "--delay": `${0.1 + idx * 0.08}s`,
                  }}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--color-spotify-green)] bg-opacity-20 mb-4">
                    <Icon
                      className="text-white"
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