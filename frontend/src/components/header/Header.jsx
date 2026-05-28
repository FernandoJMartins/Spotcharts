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

  return (
    <header className="sticky mx-autotop-0 z-50 bg-[var(--color-bg-elevated)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)] shadow-sm">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-[var(--color-spotify-green)] font-bold text-xl tracking-tight">
              ◉ CHARTS
            </span>
          </NavLink>

          {/* Navegação Desktop – centralizada com posicionamento absoluto */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {allLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Área do usuário (desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--color-text-secondary)] truncate max-w-[160px]">
                  {user.display_name || user.spotify_id}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut size={18} className="text-red-400 hover:text-red-500 transition-colors" />
                </button>
              </div>
            )}
          </div>

          {/* Botão menu mobile */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu mobile – agora com links centralizados */}
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