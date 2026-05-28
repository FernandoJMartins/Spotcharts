import { BarChart3, TrendingUp, Zap } from 'lucide-react';

const features = [
  { icon: BarChart3, title: 'Visualizações Poderosas', description: 'Gráficos de barras, linhas, donuts e mais.' },
  { icon: TrendingUp, title: 'Análise Temporal', description: 'Acompanhe suas preferências musicais.' },
  { icon: Zap, title: 'Rápido & Elegante', description: 'Interface moderna e responsiva.' },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="mx-4 p-20">
      <div className="mx-auto">
        <h2 className="text-5xl font-bold text-center mb-16 reveal" style={{ '--delay': '0.05s' }}>
          Recursos Principais
        </h2>
        <div className="flex gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="card2 reveal-scale" style={{ '--delay': `${0.1 + idx * 0.08}s` }}>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[var(--color-spotify-green)] bg-opacity-20 mb-4">
                  <Icon className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-[var(--color-text-secondary)]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}