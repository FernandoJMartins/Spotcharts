import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Zap } from "lucide-react";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/auth/me/", {
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  const features = [
    {
      icon: BarChart3,
      title: "Visualizações Poderosas",
      description: "Gráficos de barras, linhas, donuts e mais para explorar seus dados musicais.",
    },
    {
      icon: TrendingUp,
      title: "Análise Temporal",
      description: "Acompanhe como suas preferências musicais evoluem ao longo do tempo.",
    },
    {
      icon: Zap,
      title: "Rápido & Elegante",
      description: "Interface limpa, escura e responsiva. Dados musicais com clareza visual.",
    },
  ];

  return (
    <div className="bg-[var(--color-bg-elevated)] min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-7xl font-extrabold mb-6 leading-tight">
            Seus dados
            <br />
            <span className="text-[var(--color-spotify-green)]">com clareza visual.</span>
          </h1>

          <p className="text-xl text-[var(--color-text-secondary)] mb-8 leading-relaxed">
            Conecte sua conta Spotify e transforme seus top tracks, artistas e tendências
            em visualizações impressionantes. Análise profunda, design elegante.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/graficos")}
                  className="btn-primary px-8 py-4 text-lg"
                >
                  Ver Meus Gráficos
                </button>
                <a href="#features" className="btn-secondary px-8 py-4 text-lg">
                  Saiba Mais ↓
                </a>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="btn-primary px-8 py-4 text-lg"
                >
                  Começar Agora
                </button>
                <a href="#features" className="btn-secondary px-8 py-4 text-lg">
                  Ver Features ↓
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[var(--color-surface)] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16">
            Recursos Principais
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="card">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--color-spotify-green)] bg-opacity-20 mb-4">
                    <Icon className="text-[var(--color-spotify-green)]" size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-[var(--color-text-secondary)]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[var(--color-bg-elevated)] py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para explorar seus dados?
          </h2>
          <p className="text-lg text-[var(--color-text-secondary)] mb-8">
            {isAuthenticated
              ? "Seus gráficos já estão esperando por você."
              : "Conecte com Spotify e comece agora. É rápido e seguro."}
          </p>

          {!isAuthenticated && (
            <button
              onClick={() => navigate("/login")}
              className="btn-primary px-8 py-4 text-lg"
            >
              Conectar com Spotify
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-subtle)] py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-[var(--color-text-secondary)]">
          <p>SpotifyCharts © 2026 • Dados & Visualizações Musicais</p>
        </div>
      </footer>
    </div>
  );
}