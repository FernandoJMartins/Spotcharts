import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { apiFetch } from "../../utils/appClient";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // ==================== AUTENTICAÇÃO ====================
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      try {
        const res = await apiFetch("/api/auth/me/");
        if (!res.ok) throw new Error("Token inválido");

        const data = await res.json();
        setIsAuthenticated(true);
        setUser(data);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout/", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
    navigate("/login");
  };

  // ==================== LINKS ====================
  const publicLinks = [{ to: "/", label: "Início" }];
  const protectedLinks = [{ to: "/graficos", label: "Gráficos" }];

  const allLinks = isAuthenticated
    ? [...publicLinks, ...protectedLinks]
    : [...publicLinks, { to: "/login", label: "Entrar" }];

  const linkClass = ({ isActive }) =>
    `px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
      isActive
        ? "text-[var(--color-spotify-green)] bg-[var(--color-spotify-green)]/10 shadow-sm"
        : "text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface)]"
    }`;

        <div className="mx-auto relative z-10 flex flex-col  items-center text-center">
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

              {/* <p className="text-[var(--color-text-secondary)] text-lg">
                Spotify ID:{" "}
                <span className="font-mono text-sm">
                  {user.spotify_id}
                </span>
              </p> */}

              {/* {user.email && (
                <p className="text-[var(--color-text-secondary)] text-lg mt-1">
                  {user.email}
                </p> */}
          
            </div>

            {/* <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2 px-6 py-3 reveal"
              style={{ "--delay": "0.12s" }}
            >
              <LogOut size={18} />
              Sair
            </button> */}
          </div>

          {/* Cards */}
          <div className="mx-auto flex-column gap-6 mb-12 justify-items-center md:flex">
            {/* Perfil */}
            <div
              className="card2 reveal-scale w-full max-w-sm"
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
              className="card2 cursor-pointer hover:border-[var(--color-spotify-green)] transition-colors reveal-scale"
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
              className="card2 reveal-scale w-full max-w-sm"
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
    <header className="sticky top-0 z-50 bg-[var(--color-bg-elevated)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Layout grid: 3 colunas -> logo | nav centralizado | usuário */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16">
          {/* Coluna 1 - Logo (alinhada à esquerda) */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0 justify-self-start">
            <span className="text-[var(--color-spotify-green)] font-bold text-xl tracking-tight">
              ◉ CHARTS
            </span>
          </NavLink>

          {/* Coluna 2 - Navegação (centralizada) */}
          <nav className="hidden md:flex items-center gap-1 justify-self-center">
            {allLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

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

          {/* Botão menu mobile (aparece no lugar da grid no mobile, mas ainda dentro do flex) */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors justify-self-end"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu mobile */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--color-border-subtle)] py-4 animate-fade-in">
            <nav className="flex flex-col items-center gap-2">
              {allLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-6 py-2 text-sm font-medium w-full text-center transition-all duration-200 rounded-lg ${
                      isActive
                        ? "text-[var(--color-spotify-green)] bg-[var(--color-spotify-green)]/10"
                        : "text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-surface)]"
                    }`
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {isAuthenticated && user && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] flex flex-col items-center gap-3">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {user.display_name || user.spotify_id}
                </span>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[var(--color-surface)] rounded-lg transition-colors w-full justify-center"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}