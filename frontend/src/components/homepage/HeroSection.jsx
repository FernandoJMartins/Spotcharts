import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative flex-1 flex items-center justify-center px-4 py-20">
      <div className="hero-ornaments" aria-hidden="true">
        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
        <div className="hero-grid" />
      </div>

      <div className="max-w-2xl w-full text-center relative z-10">
        <h1 className="text-7xl font-extrabold mb-6 leading-tight reveal">
          Seus dados<br />
          <span className="text-[var(--color-spotify-green)] glow-text">com clareza visual.</span>
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] mb-8 leading-relaxed reveal" style={{ '--delay': '0.08s' }}>
          Conecte sua conta Spotify e transforme seus top tracks, artistas e tendências em visualizações impressionantes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center reveal" style={{ '--delay': '0.16s' }}>
          <button onClick={() => navigate('/login')} className="btn-primary px-8 py-4 text-lg">
            Começar Agora
          </button>
          <a href="#features" className="btn-secondary px-8 py-4 text-lg">
            Ver Features ↓
          </a>
        </div>
      </div>
    </section>
  );
}