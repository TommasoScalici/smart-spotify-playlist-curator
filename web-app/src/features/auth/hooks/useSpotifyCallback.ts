import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useSpotifyStatus } from '@/features/auth/hooks/useSpotifyStatus';
import { FunctionsService } from '@/services/functions-service';

export function useSpotifyCallback() {
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
    if (status === 'error' && !code) return;
    if (!code || !user || linkingRef.current || isActuallyLinked) return;

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

  return {
    effectiveStatus,
    errorMsg,
    isActuallyLinked,
    spotifyData,
    status
  };
}
