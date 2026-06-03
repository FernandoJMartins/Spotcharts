import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import CTASection from './CTASection';
import Footer from '../Footer';

export default function LandingPage() {
  return (
    <div className="page-bg bg-[var(--color-bg-elevated)] flex flex-col">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
}