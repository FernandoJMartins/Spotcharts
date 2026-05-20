import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { withApiBase } from "../../utils/apiBase";
import { LogOut, BarChart3, TrendingUp, Zap, Music, Clock, Headphones, Award } from 'lucide-react';
import { apiFetch } from "../../utils/appClient";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './home.css'
export default function HomePage() {
  // Dados mockados para gráficos
  const listeningHistoryData = [
    { month: 'Jan', plays: 420 },
    { month: 'Fev', plays: 580 },
    { month: 'Mar', plays: 750 },
    { month: 'Abr', plays: 690 },
    { month: 'Mai', plays: 920 },
    { month: 'Jun', plays: 1100 },
  ];
 
  const topGenresData = [
    { genre: 'Pop', count: 45 },
    { genre: 'Rock', count: 38 },
    { genre: 'Hip Hop', count: 32 },
    { genre: 'Eletrônica', count: 28 },
    { genre: 'Indie', count: 22 },
  ];
 
  const listeningTimeData = [
    { name: 'Manhã', value: 18, color: '#1DB954' },
    { name: 'Tarde', value: 35, color: '#1ed760' },
    { name: 'Noite', value: 32, color: '#22c55e' },
    { name: 'Madrugada', value: 15, color: '#16a34a' },
  ];
 
  const statsCards = [
    { icon: Music, label: 'Total de Plays', value: '4,460', trend: '+12%' },
    { icon: Clock, label: 'Horas Ouvidas', value: '156h', trend: '+8%' },
    { icon: Headphones, label: 'Artistas Únicos', value: '87', trend: '+15%' },
    { icon: Award, label: 'Top Gênero', value: 'Pop', trend: '45 plays' },
  ];

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
      <div className="flex mx-auto items-center justify-center min-h-screen bg-[var(--color-bg-elevated)]">
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

  if (isAuthenticated && user) {
    return (
      <div className="items-center page-bg bg-[var(--color-bg-elevated)] min-h-screen py-20 px-4">
        <div className="hero-ornaments" aria-hidden="true">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-grid" />
        </div>
 
        <div className="max-w-7xl items-center justify-center mx-auto relative z-10">
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-6 mb-16">
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
 
          <div className="w-full mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center reveal" style={{ "--delay": "0.15s" }}>
              Suas Estatísticas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="card reveal-scale"
                    style={{ "--delay": `${0.18 + idx * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                        <Icon className="text-[var(--color-spotify-green)]" size={24} />
                      </div>
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-2">
                      {stat.label}
                    </p>
                    <div className="flex items-end justify-between">
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <span className="text-[var(--color-spotify-green)] text-sm font-medium">
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
 
          {/* Charts Section */}
          <div className="w-full mb-12 grid lg:grid-cols-2 gap-8">
            {/* Listening History Chart */}
            <div
              className="card reveal-scale"
              style={{ "--delay": "0.4s" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Histórico de Reproduções</h3>
                <TrendingUp className="text-[var(--color-spotify-green)]" size={24} />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={listeningHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.3} />
                  <XAxis 
                    dataKey="month" 
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="plays"
                    stroke="var(--color-spotify-green)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--color-spotify-green)', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
 
            <div
              className="card reveal-scale"
              style={{ "--delay": "0.45s" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Top Gêneros</h3>
                <BarChart3 className="text-[var(--color-spotify-green)]" size={24} />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topGenresData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.3} />
                  <XAxis 
                    dataKey="genre" 
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="var(--color-text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="var(--color-spotify-green)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
 
            <div
              className="card reveal-scale"
              style={{ "--delay": "0.5s" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Distribuição de Escuta</h3>
                <Clock className="text-[var(--color-spotify-green)]" size={24} />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={listeningTimeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {listeningTimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
 
            {/* Profile Summary Card */}
            <div
              className="card reveal-scale"
              style={{ "--delay": "0.55s" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Resumo do Perfil</h3>
                <BarChart3 className="text-[var(--color-spotify-green)]" size={24} />
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-spotify-green)] bg-opacity-20 flex items-center justify-center">
                    <Music className="text-[var(--color-spotify-green)]" size={28} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{user.display_name}</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">Conta Spotify ativa</p>
                  </div>
                </div>
 
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-subtle)]">
                    <span className="text-[var(--color-text-secondary)]">Última sincronização</span>
                    <span className="font-semibold">
                      {user.last_sync
                        ? new Date(user.last_sync).toLocaleDateString("pt-BR")
                        : "Nunca"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-[var(--color-border-subtle)]">
                    <span className="text-[var(--color-text-secondary)]">Membro desde</span>
                    <span className="font-semibold">2023</span>
                  </div>
 
                  <div className="flex justify-between items-center py-3">
                    <span className="text-[var(--color-text-secondary)]">Status</span>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[var(--color-spotify-green)] rounded-full animate-pulse" />
                      <span className="font-semibold text-[var(--color-spotify-green)]">Ativo</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
 
          <div
            className="w-full max-w-5xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg p-8 text-center reveal"
            style={{ "--delay": "0.6s" }}
          >
            <h2 className="text-3xl font-bold mb-4">
              Pronto para explorar?
            </h2>
 
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
              Visualize seus top tracks, artistas, tendências e muito mais em gráficos interativos detalhados.
            </p>
 
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate("/graficos")}
                className="btn-primary px-8 py-4 text-lg w-full sm:w-auto"
              >
                Ver Gráficos →
              </button>
 
              <button
                onClick={() => navigate("/top-tracks")}
                className="btn-secondary px-8 py-4 text-lg w-full sm:w-auto"
              >
                Ver Top Tracks →
              </button>
            </div>
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