import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoaderCircle } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 text-muted-foreground gap-3">
          <LoaderCircle className="animate-spin" /> Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};