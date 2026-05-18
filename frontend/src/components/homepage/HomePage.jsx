import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Zap, LogOut } from "lucide-react";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Função para checar autenticação
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me/", {
          credentials: "include",
        });
        
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setUser(data);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // Executa apenas uma vez quando monta

  const handleLogout = async () => {
    await fetch("/api/auth/logout/", {
      method: "POST",
      credentials: "include",
    });
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
          <p className="text-[var(--color-text-secondary)]">Carregando...</p>
        </div>
      </div>
    );
  }

  // ============ USUARIO LOGADO - DASHBOARD ============
  if (isAuthenticated && user) {
    return (
      <div className="bg-[var(--color-bg-elevated)] min-h-screen py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-5xl font-extrabold mb-2">
                Bem-vindo, <span className="text-[var(--color-spotify-green)]">{user.display_name}</span>
              </h1>
              <p className="text-[var(--color-text-secondary)] text-lg">
                Spotify ID: <span className="font-mono text-sm">{user.spotify_id}</span>
              </p>
              {user.email && (
                <p className="text-[var(--color-text-secondary)] text-lg mt-1">
                  {user.email}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2 px-6 py-3"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>

          {/* User Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* User Info Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Perfil</h3>
                <div className="w-10 h-10 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                  <BarChart3 className="text-[var(--color-spotify-green)]" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">{user.display_name}</p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Conta Spotify ativa
              </p>
            </div>

            {/* Top Tracks Card */}
            <div className="card cursor-pointer hover:border-[var(--color-spotify-green)] transition-colors"
              onClick={() => navigate("/graficos")}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Top Faixas</h3>
                <div className="w-10 h-10 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                  <TrendingUp className="text-[var(--color-spotify-green)]" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">Visualizar</p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Suas músicas mais ouvidas
              </p>
            </div>

            {/* Last Sync Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sincronização</h3>
                <div className="w-10 h-10 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                  <Zap className="text-[var(--color-spotify-green)]" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold mb-2">
                {user.last_sync ? "✓" : "−"}
              </p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                {user.last_sync
                  ? `Última atualização: ${new Date(user.last_sync).toLocaleDateString("pt-BR")}`
                  : "Nunca sincronizado"
                }
              </p>
            </div>
          </div>

          {/* Main CTA */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Pronto para explorar?</h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
              Visualize seus top tracks, artistas, tendências e muito mais em gráficos interativos.
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

  // ============ NAO LOGADO - LANDING PAGE ============
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
            <button
              onClick={() => navigate("/login")}
              className="btn-primary px-8 py-4 text-lg"
            >
              Começar Agora
            </button>
            <a href="#features" className="btn-secondary px-8 py-4 text-lg">
              Ver Features ↓
            </a>
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
            {[
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
            ].map((feature, idx) => {
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
            Conecte com Spotify e comece agora. É rápido e seguro.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="btn-primary px-8 py-4 text-lg"
          >
            Conectar com Spotify
          </button>
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