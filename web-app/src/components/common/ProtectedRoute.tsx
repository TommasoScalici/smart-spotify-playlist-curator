import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="bg-background flex min-h-screen w-full items-center justify-center p-6">
        <div className="glass-panel flex flex-col items-center gap-4 rounded-3xl p-8 shadow-2xl">
          <Loader2 className="text-primary h-10 w-10 animate-spin stroke-[1.5px]" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium">
            Authenticating session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  return children;
};
