import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { withApiBase } from "../../utils/apiBase";

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
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

  localStorage.removeItem("token");
  setIsAuthenticated(false);
  setUser(null);

  if (token) {
    try {
      await fetch(withApiBase("/api/auth/logout/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Erro ao notificar logout:", error);
    }
  }

  navigate("/login", { replace: true });
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
    const base = "px-8 py-4 text-sm transition-all duration-200";

    return isActive
      ? `${base} text-green-500 font-semibold border-b-2 border-green-500`
      : `${base} text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`;
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
  <div className="relative flex items-center justify-between h-16 px-6">
    
    <NavLink to="/">
      <div className="text-[var(--color-spotify-green)] font-bold text-lg">
        ◉ CHARTS
      </div>
    </NavLink>

    <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2">
      {allLinks.map((link) => (
        <NavLink key={link.to} to={link.to} className={linkClass}>
          {link.label}
        </NavLink>
      ))}
    </nav>

    <div>
      {isAuthenticated && user && (
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-[var(--color-surface)] rounded-lg"
        >
          <LogOut size={18} className="text-red-500" />
        </button>
      )}
    </div>

  </div>
</header>
  );
}