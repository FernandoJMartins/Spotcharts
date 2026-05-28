import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { withApiBase } from "../../utils/apiBase";
import { apiFetch } from "../../utils/appClient";
export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check auth status apenas uma vez
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      try {
        const res = await fetch(withApiBase("/api/auth/me/"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    navigate("/login");
  };

  checkAuth();
}, []);

const handleLogout = async () => {
  await apiFetch("/api/auth/logout/", {
    method: "POST",
  });

  localStorage.removeItem("token");
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
    const base = "px-8 py-4 text-sm  transition-all duration-200";
    return isActive
      ? `${base} text-green-500 font-semibold border-b-2 border-green-500`
      : `${base} text-[var(--color-text-secondary)] `;
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">

      <div className="flex items-center h-16">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2">
          <div className="text-[var(--color-spotify-green)] font-bold text-lg">
            ◉ CHARTS
          </div>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden md:flex justify-end items-center gap-2">
          {allLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Side (centralize do lado direito) */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user && (
            <div className="hidden sm:flex items-center">
              {/* <span className="text-sm text-[var(--color-text-secondary)]">
                {user.display_name || user.spotify_id}
              </span> */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={18} className="text-red-500" />
              </button>
            </div>
          )}

        </div>
      </div>


    </header>
  );
}