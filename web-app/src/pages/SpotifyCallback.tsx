import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FunctionsService } from '../services/functions-service';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpotifyStatus } from '../hooks/useSpotifyStatus';

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const linkingRef = useRef(false);

  const code = searchParams.get('code');
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(() => {
    return code ? 'processing' : 'error';
  });
  const [errorMsg, setErrorMsg] = useState(() => {
    return code ? '' : 'No authentication code received from Spotify.';
  });

  const { data: spotifyData } = useSpotifyStatus(user?.uid);
  const isActuallyLinked = spotifyData?.isLinked;
  const effectiveStatus = isActuallyLinked ? 'success' : status;

  useEffect(() => {
    if (effectiveStatus !== 'success') return;

    const timer = setTimeout(() => navigate('/'), 1200); // FASTER redirection
    return () => clearTimeout(timer);
  }, [effectiveStatus, navigate]);

  useEffect(() => {
    if (status === 'error' && !code) {
      return;
    }

    // CRITICAL: If data confirms we are already linked, DON'T attempt to exchange code again.
    // This prevents the "Link FAILED" error on page refresh if the link was actually successful.
    if (!code || !user || linkingRef.current || isActuallyLinked) {
      return;
    }

    const linkAccount = async () => {
      linkingRef.current = true;
      try {
        const redirectUri =
          import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;
        const result = await FunctionsService.linkSpotifyAccount(code, redirectUri);
        if (result.success && result.profile) {
          queryClient.setQueryData(['spotifyConnection', user.uid], {
            isLinked: true,
            profile: result.profile
          });
        }
        setStatus('success');
      } catch (error) {
        console.error('Linking failed', error);
        setStatus('error');
        setErrorMsg(
          "We couldn't link your account right now. This might be due to a timeout or invalid session."
        );
      }
    };

    if (status === 'processing') {
      linkAccount();
    }
  }, [code, user, status, queryClient, isActuallyLinked]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="relative w-full max-w-md">
        {/* Decorative Background Glow */}
        <div
          className={cn(
            'absolute -inset-4 rounded-[2rem] blur-2xl opacity-20 transition-colors duration-1000',
            effectiveStatus === 'processing'
              ? 'bg-primary'
              : effectiveStatus === 'success'
                ? 'bg-green-500'
                : 'bg-destructive'
          )}
        />

        <div className="relative glass-panel rounded-[2rem] p-8 md:p-12 text-center border-white/10 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
            {effectiveStatus === 'processing' && (
              <div className="h-full bg-primary animate-progress-indeterminate" />
            )}
          </div>

          {effectiveStatus === 'processing' && (
            <div className="space-y-6">
              <div className="relative inline-flex items-center justify-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin stroke-[1.5px]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Linking Spotify</h2>
                <p className="text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  Please wait while we secure your connection and sync your profile.
                </p>
              </div>
            </div>
          )}

          {effectiveStatus === 'success' && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-500/10 text-green-500 ring-1 ring-green-500/20 shadow-lg shadow-green-500/10">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Successfully Linked!</h2>
                <p className="text-muted-foreground">
                  Welcome back,{' '}
                  <span className="text-foreground font-semibold">
                    {spotifyData?.profile?.displayName || 'Music Lover'}
                  </span>
                  .
                </p>
                <p className="text-muted-foreground text-xs opacity-70">
                  Redirecting to your dashboard...
                </p>
              </div>
            </div>
          )}

          {effectiveStatus === 'error' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20 shadow-lg shadow-destructive/10">
                <XCircle className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight">Linking Failed</h2>
                <p className="text-muted-foreground text-sm leading-relaxed px-4">{errorMsg}</p>
              </div>

              <div className="pt-4">
                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 group transition-all"
                >
                  <Link to="/">
                    <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
