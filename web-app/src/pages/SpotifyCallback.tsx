import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useAuth } from '../contexts/AuthContext';
import { useSpotifyStatus } from '../hooks/useSpotifyStatus';
import { FunctionsService } from '../services/functions-service';

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const linkingRef = useRef(false);

  const code = searchParams.get('code');
  const [status, setStatus] = useState<'error' | 'processing' | 'success'>(() => {
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

    const timer = setTimeout(() => navigate('/'), 1200);

    return () => clearTimeout(timer);
  }, [effectiveStatus, navigate]);

  useEffect(() => {
    if (status === 'error' && !code) {
      return;
    }

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
    <div className="animate-in fade-in flex flex-1 items-center justify-center p-6 duration-500">
      <div className="relative w-full max-w-md">
        {/* Decorative Background Glow */}
        <div
          className={cn(
            'absolute -inset-4 rounded-4xl opacity-20 blur-2xl transition-colors duration-1000',
            effectiveStatus === 'processing'
              ? 'bg-primary'
              : effectiveStatus === 'success'
                ? 'bg-green-500'
                : 'bg-destructive'
          )}
        />

        <div className="glass-panel relative overflow-hidden rounded-4xl border-white/10 p-8 text-center shadow-2xl md:p-12">
          <div className="absolute top-0 left-0 h-1 w-full overflow-hidden bg-white/5">
            {effectiveStatus === 'processing' && (
              <div className="bg-primary animate-progress-indeterminate h-full" />
            )}
          </div>

          {effectiveStatus === 'processing' && (
            <div className="space-y-6">
              <div className="relative inline-flex items-center justify-center">
                <Loader2 className="text-primary h-16 w-16 animate-spin stroke-[1.5px]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Linking Spotify</h2>
                <p className="text-muted-foreground mx-auto max-w-[240px] leading-relaxed">
                  Please wait while we secure your connection and sync your profile.
                </p>
              </div>
            </div>
          )}

          {effectiveStatus === 'success' && (
            <div className="animate-in zoom-in-95 space-y-6 duration-500">
              <div className="inline-flex items-center justify-center rounded-full bg-green-500/10 p-4 text-green-500 shadow-lg ring-1 shadow-green-500/10 ring-green-500/20">
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
            <div className="animate-in slide-in-from-bottom-4 space-y-8 duration-500">
              <div className="bg-destructive/10 text-destructive ring-destructive/20 shadow-destructive/10 inline-flex items-center justify-center rounded-full p-4 shadow-lg ring-1">
                <XCircle className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight">Linking Failed</h2>
                <p className="text-muted-foreground px-4 text-sm leading-relaxed">{errorMsg}</p>
              </div>

              <div className="pt-4">
                <Button
                  asChild
                  className="group w-full border-white/10 bg-white/5 transition-all hover:bg-white/10"
                  variant="outline"
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
