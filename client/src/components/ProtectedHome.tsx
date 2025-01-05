import { useAuth } from '../contexts/AuthContext';
import { LoaderCircle } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { Home } from './Home';

export const ProtectedHome = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 text-muted-foreground gap-3">
          <LoaderCircle className="animate-spin" /> Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Home />;
  }

  return <Dashboard />;
};