import { BarChart3, TrendingUp, Zap, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './style.module.css';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import Footer from '../Footer';

export default function AuthenticatedDashboard({ user }) {
  const navigate = useNavigate();

  return (
    <div className={styles['sp-root','page-bg']}>
      <div className={styles['sp-orb']} aria-hidden="true" />
      <div className={styles['sp-orb-1']} aria-hidden="true" />
      <div className={styles['sp-orb-2']} aria-hidden="true" />
      <div className={styles['sp-noise']} aria-hidden="true" />

      <div className={styles['sp-inner']}>
        <div className={styles['sp-eyebrow']} aria-hidden="true">
          <span className={styles['sp-eyebrow-dot']} />
          <span className={styles['sp-eyebrow-label']}>Spotify conectado</span>
        </div>

        <h1 className={styles['sp-headline']}>
          Olá, <span className={styles['sp-headline-muted']}>{user.display_name}</span>
        </h1>
        <p className={styles['sp-subline']}>Tudo pronto para explorar sua música</p>

        <div className={styles['sp-cards']}>
          <div className={styles['sp-card']}>
            <div className={styles['sp-card-header']}>
              <span className={styles['sp-card-label']}>Perfil</span>
              <div className={styles['sp-icon-wrap']}>
                <BarChart3 size={16} />
              </div>
            </div>
            <p className={styles['sp-card-value']}>{user.display_name}</p>
            <p className={styles['sp-card-desc']}>Conta Spotify ativa</p>
          </div>

          <div
            className={`${styles['sp-card']} ${styles['sp-clickable']}`}
            onClick={() => navigate('/graficos')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/graficos')}
          >
            <div className={styles['sp-card-header']}>
              <span className={styles['sp-card-label']}>Top Faixas</span>
              <div className={styles['sp-icon-wrap']}>
                <TrendingUp size={16} />
              </div>
            </div>
            <p className={styles['sp-card-value']}>Visualizar</p>
            <p className={styles['sp-card-desc']}>Suas músicas mais ouvidas</p>
            <span className={styles['sp-card-arrow']} aria-hidden="true">
              <ArrowUpRight size={18} />
            </span>
          </div>

          <div className={styles['sp-card']}>
            <div className={styles['sp-card-header']}>
              <span className={styles['sp-card-label']}>Sincronização</span>
              <div className={styles['sp-icon-wrap']}>
                <Zap size={16} />
              </div>
            </div>

            <p
              className={`${styles['sp-card-value']} ${
                user.last_sync ? styles['sp-green'] : ''
              }`}
            >
              {user.last_sync ? '✓ Sincronizado' : '—'}
            </p>

            <p className={styles['sp-card-desc']}>
              {user.last_sync
                ? `Última atualização: ${new Date(user.last_sync).toLocaleDateString('pt-BR')}`
                : 'Nunca sincronizado'}
            </p>
          </div>
        </div>

        <div className={styles['sp-cta']}>
          <div className={styles['sp-cta-deco']} aria-hidden="true" />
          <div className={styles['sp-cta-text']}>
            <h2>Pronto para explorar?</h2>
            <p>
              Visualize seus top tracks, artistas, tendências e muito mais em gráficos interativos.
            </p>
          </div>
          <button className={styles['sp-btn']} onClick={() => navigate('/graficos')}>
            Ver Gráficos →
          </button>
        </div>
      </div>
    <div className=" flex flex-col">
      <HeroSection user={user}/>
      <FeaturesSection />
      <Footer />
    </div>
    </div>
  );
}