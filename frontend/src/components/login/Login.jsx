import { useEffect } from "react";

export default function Login() {
  const handleSpotifyLogin = () => {
    window.location.href = "/api/auth/login/";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg-elevated)] gap-[var(--spacing-2xl)]">
      <div className="flex flex-col items-center gap-[var(--spacing-lg)] max-w-xl text-center">
        {/* Logo/Brand */}
        <div className="text-[var(--color-spotify-green)] font-semibold text-sm tracking-widest">
          ● SPOTIFYCHARTS
        </div>

        {/* Main Heading */}
        <h1 className="text-6xl font-extrabold leading-tight">
          Dados musicais
          <br />
          <span className="text-[var(--color-spotify-green)]">com clareza visual.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed max-w-md">
          Transforme seus dados do Spotify em gráficos e visualizações impressionantes.
          Analise seus top tracks, artistas e tendências com máxima legibilidade.
        </p>

        {/* Buttons */}
        <div className="flex gap-[var(--spacing-md)] mt-[var(--spacing-xl)]">
          <button
            onClick={handleSpotifyLogin}
            className="btn-primary px-8 py-3 text-lg"
          >
            ▶ Conectar com Spotify
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary px-8 py-3 text-lg"
          >
            Documentação ↗
          </a>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-[var(--spacing-xl)] text-center text-[var(--color-text-secondary)] text-sm">
        <p>SpotifyCharts © 2026 • Dados & Visualizações</p>
      </div>
    </div>
  );
}
