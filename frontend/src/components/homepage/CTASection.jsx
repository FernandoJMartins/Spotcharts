import { useNavigate } from 'react-router-dom';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="bg-[var(--color-bg-elevated)] py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6 reveal" style={{ '--delay': '0.05s' }}>
          Pronto para explorar seus dados?
        </h2>
        <p className="text-lg text-[var(--color-text-secondary)] mb-8 reveal" style={{ '--delay': '0.12s' }}>
          Conecte com Spotify e comece agora.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="btn-primary px-8 py-4 text-lg reveal"
          style={{ '--delay': '0.2s' }}
        >
          Conectar com Spotify
        </button>
      </div>
    </section>
  );
}