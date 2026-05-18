import { withApiBase } from "../../utils/apiBase";

export default function Login() {
  const apiLoginUrl = withApiBase("/api/auth/login/");

  const handleSpotifyLogin = () => {
    window.location.href = apiLoginUrl;
  };

  return (
    <div className="page-bg flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg-elevated)] gap-[var(--spacing-2xl)]">
      <div className="hero-ornaments" aria-hidden="true">
        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
        <div className="hero-grid" />
      </div>
      <div className="flex flex-col items-center gap-[var(--spacing-lg)] max-w-xl text-center relative z-10">
        {/* Logo/Brand */}
        <div className="text-[var(--color-spotify-green)] font-semibold text-sm tracking-widest reveal">
          ● SPOTIFYCHARTS
        </div>

        {/* Main Heading */}
        <h1 className="text-6xl font-extrabold leading-tight reveal" style={{ "--delay": "0.06s" }}>
          Dados musicais
          <br />
          <span className="text-[var(--color-spotify-green)] glow-text">com clareza visual.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed max-w-md reveal" style={{ "--delay": "0.12s" }}>
          Transforme seus dados do Spotify em gráficos e visualizações impressionantes.
          Analise seus top tracks, artistas e tendências com máxima legibilidade.
        </p>

        {/* Buttons */}
        <div className="flex gap-[var(--spacing-md)] mt-[var(--spacing-xl)] reveal" style={{ "--delay": "0.18s" }}>
          <button
            onClick={handleSpotifyLogin}
            className="btn-primary px-8 py-3 text-lg"
          >
            ▶ Conectar com Spotify
          </button>
          {/* <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary px-8 py-3 text-lg"
          >
            Documentação ↗
          </a> */}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-[var(--spacing-xl)] text-center text-[var(--color-text-secondary)] text-sm reveal" style={{ "--delay": "0.3s" }}>
        <p>SpotifyCharts © 2026 • Dados & Visualizações</p>
      </div>
    </div>
  );
}
