import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check auth status apenas uma vez
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
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout/", {
      method: "POST",
      credentials: "include",
    });
    setIsAuthenticated(false);
    setUser(null);
    navigate("/login");
  };

  const publicLinks = [
    { to: "/", label: "Início" },
  ];

  const protectedLinks = [
    { to: "/graficos", label: "Gráficos" },
  ];

  const allLinks = isAuthenticated
    ? [...publicLinks, ...protectedLinks]
    : [...publicLinks, { to: "/login", label: "Entrar" }];

  const linkClass = ({ isActive }) => {
    const base = "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200";
    return isActive
      ? `${base} bg-[var(--color-spotify-green)] text-black`
      : `${base} text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`;
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="text-[var(--color-spotify-green)] font-bold text-lg">
              ◉ CHARTS
            </div>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {allLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {user.display_name || user.spotify_id}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut size={18} className="text-[var(--color-text-secondary)]" />
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[var(--color-surface)] border-t border-[var(--color-border-subtle)]">
          <nav className="flex flex-col gap-1 p-4">
            {allLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={linkClass}
              >
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated && (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--color-bg-elevated)]"
              >
                Sair
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}