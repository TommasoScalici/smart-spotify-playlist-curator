import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

export function useLogin() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await signIn();
      navigate('/');
    } catch {
      setError('Failed to log in. Please try again.');
    }
  };

  return {
    error,
    handleLogin,
    user
  };
}
