import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Music } from "lucide-react";
import { clsx } from "clsx";

const useAuth = () => {
  return { isAuthenticated: false }; 
};

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const publicLinks = [
    { to: "/", label: "Início" },
    { to: "/login", label: "Entrar" },
    { to: "/registro", label: "Registrar" },
  ];

  const protectedLinks = [
    { to: "/graficos", label: "Gráficos" },
  ];

  const allLinks = [
    ...publicLinks,
    ...(isAuthenticated ? protectedLinks : []),
  ];

  const linkClass = ({ isActive }) =>
    clsx(
      "px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200",
      isActive
        ? "bg-white/10 text-white"
        : "text-gray-300 hover:text-white hover:bg-white/5"
    );

  return (
    <header className="bg-[#121212] border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center gap-2 text-white">
            <Music className="h-8 w-8 text-[#1DB954]" />
            <span className="text-xl font-bold tracking-tight">SportifyCharts</span>
          </NavLink>

          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {allLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#181818] border-t border-white/5 px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
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
          </nav>
        </div>
      )}
    </header>
  );
}