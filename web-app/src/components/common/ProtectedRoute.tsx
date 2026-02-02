import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { loading, user } = useAuth();

  if (loading) return <div className="loading-spinner"></div>;

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  return children;
};
