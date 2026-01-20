import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-spinner"></div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
