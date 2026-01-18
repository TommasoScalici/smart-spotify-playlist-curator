import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Music, Chrome } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505] animate-in fade-in duration-1000">
      {/* Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[400px] space-y-8 text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-2xl shadow-primary/20 backdrop-blur-xl animate-bounce-subtle">
            <Music className="h-10 w-10" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tighter leading-tight">
              Smart <span className="text-primary italic">Curator</span>
            </h1>
            <p className="text-muted-foreground font-medium px-4">
              Professional-grade playlist automation. AI-powered orchestration.
            </p>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 text-xs font-bold bg-destructive/10 text-destructive rounded-xl border border-destructive/20 animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <Button
            onClick={handleLogin}
            size="lg"
            className="w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90 font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
          >
            <Chrome className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>

          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">
            <span>v2.0 Beta</span>
            <span className="h-1 w-1 bg-current rounded-full" />
            <span>OAuth 2.0</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/40 font-medium">
          By signing in, you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
