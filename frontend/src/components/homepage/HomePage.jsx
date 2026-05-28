import { useAuth } from '../../utils/useeAuth'
import LoadingSpinner from '../LoadingSpinner';
import AuthenticatedDashboard from './AuthenticatedDashboard';
import LandingPage from './LandingPage';

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user) return <AuthenticatedDashboard user={user} onLogout={logout} />;
  return <LandingPage />;
}