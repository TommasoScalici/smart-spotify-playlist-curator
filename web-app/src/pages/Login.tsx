import { Chrome, Music } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  if (user) {
    navigate('/');
    return null;
  }

  const handleLogin = async () => {
    try {
      await signIn();
      navigate('/');
    } catch {
      setError('Failed to log in. Please try again.');
    }
  };

  return (
    <div className="bg-background animate-in fade-in relative flex min-h-screen items-center justify-center overflow-hidden p-6 duration-1000">
      {/* Ambient Glow */}
      <div className="bg-primary/20 pointer-events-none absolute top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]" />

      <div className="relative w-full max-w-[400px] space-y-8 text-center">
        <div className="space-y-6">
          <div className="bg-primary/10 text-primary ring-primary/20 shadow-primary/20 animate-bounce-subtle inline-flex items-center justify-center rounded-3xl p-4 shadow-2xl ring-1 backdrop-blur-xl">
            <Music className="h-10 w-10" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl leading-tight font-black tracking-tighter">
              Smart <span className="text-primary italic">Curator</span>
            </h1>
            <p className="text-muted-foreground px-4 font-medium">
              Professional-grade playlist automation. AI-powered orchestration.
            </p>
          </div>
        </div>

        <div className="glass-panel space-y-6 rounded-[2.5rem] border-white/5 p-8 shadow-2xl">
          {error && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 animate-in slide-in-from-top-2 rounded-xl border p-3 text-xs font-bold">
              {error}
            </div>
          )}

          <Button
            className="bg-foreground text-background hover:bg-foreground/90 h-14 w-full rounded-2xl font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95"
            onClick={handleLogin}
            size="lg"
          >
            <Chrome className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>

          <div className="text-muted-foreground flex items-center justify-center gap-4 text-[10px] font-bold tracking-widest uppercase opacity-40">
            <span>v1.3.0</span>
            <span className="h-1 w-1 rounded-full bg-current" />
            <span>OAuth 2.0</span>
          </div>
        </div>

        <p className="text-muted-foreground/40 text-[10px] font-medium">
          By signing in, you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
