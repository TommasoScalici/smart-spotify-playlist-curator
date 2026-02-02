import { User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { AuthService } from '../services/auth-service';

interface AuthContextType {
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  user: null | User;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<null | User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    await AuthService.signInWithGoogle();
  };

  const signOut = async () => {
    await AuthService.signOut();
  };

  return (
    <AuthContext.Provider value={{ loading, signIn, signOut, user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
