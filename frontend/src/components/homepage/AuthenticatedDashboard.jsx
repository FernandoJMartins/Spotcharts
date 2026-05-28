import { BarChart3, TrendingUp, Zap, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuthenticatedDashboard({ user }) {
  const navigate = useNavigate();

  return (
    <div className="sp-root">
      <div className="sp-orb sp-orb-1" aria-hidden="true" />
      <div className="sp-orb sp-orb-2" aria-hidden="true" />
      <div className="sp-noise" aria-hidden="true" />

      <div className="sp-inner">
        <div className="sp-eyebrow" aria-hidden="true">
          <span className="sp-eyebrow-dot" />
          <span className="sp-eyebrow-label">Spotify conectado</span>
        </div>

        <h1 className="sp-headline">
          Olá, <span className="sp-headline-muted">{user.display_name}</span>
        </h1>
        <p className="sp-subline">Tudo pronto para explorar sua música</p>

        <div className="sp-cards">
          {/* Perfil */}
          <div className="sp-card">
            <div className="sp-card-header">
              <span className="sp-card-label">Perfil</span>
              <div className="sp-icon-wrap">
                <BarChart3 size={16} />
              </div>
            </div>
            <p className="sp-card-value">{user.display_name}</p>
            <p className="sp-card-desc">Conta Spotify ativa</p>
          </div>

          {/* Top Tracks */}
          <div
            className="sp-card sp-clickable"
            onClick={() => navigate('/graficos')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/graficos')}
          >
            <div className="sp-card-header">
              <span className="sp-card-label">Top Faixas</span>
              <div className="sp-icon-wrap">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="sp-card-value">Visualizar</p>
            <p className="sp-card-desc">Suas músicas mais ouvidas</p>
            <span className="sp-card-arrow" aria-hidden="true">
              <ArrowUpRight size={18} />
            </span>
          </div>

          {/* Sincronização */}
          <div className="sp-card">
            <div className="sp-card-header">
              <span className="sp-card-label">Sincronização</span>
              <div className="sp-icon-wrap">
                <Zap size={16} />
              </div>
            </div>
            <p className={`sp-card-value${user.last_sync ? ' sp-green' : ''}`}>
              {user.last_sync ? '✓ Sincronizado' : '—'}
            </p>
            <p className="sp-card-desc">
              {user.last_sync
                ? `Última atualização: ${new Date(user.last_sync).toLocaleDateString('pt-BR')}`
                : 'Nunca sincronizado'}
            </p>
          </div>
        </div>

        <div className="sp-cta">
          <div className="sp-cta-deco" aria-hidden="true" />
          <div className="sp-cta-text">
            <h2>Pronto para explorar?</h2>
            <p>
              Visualize seus top tracks, artistas, tendências e muito mais em gráficos interativos.
            </p>
          </div>
          <button className="sp-btn" onClick={() => navigate('/graficos')}>
            Ver Gráficos →
          </button>
        </div>
      </div>
    </div>
  );
}