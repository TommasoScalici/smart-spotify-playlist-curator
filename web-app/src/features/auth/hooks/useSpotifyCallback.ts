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
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const getInitialState = () => {
    const stateParam = searchParams.get('state');
    const storedState = sessionStorage.getItem('spotify_auth_state');

    if (errorParam === 'access_denied') {
      if (storedState) sessionStorage.removeItem('spotify_auth_state');
      return {
        errorMsg:
          'Spotify authorization was cancelled or denied. Please grant permissions to proceed.',
        status: 'error' as const
      };
    }
    if (errorParam) {
      if (storedState) sessionStorage.removeItem('spotify_auth_state');
      return {
        errorMsg: errorDescription || `Spotify authorization failed (${errorParam}).`,
        status: 'error' as const
      };
    }
    if (storedState) {
      sessionStorage.removeItem('spotify_auth_state');
      if (!stateParam || stateParam !== storedState) {
        return {
          errorMsg: 'Invalid or missing authorization state. Possible CSRF security risk detected.',
          status: 'error' as const
        };
      }
    }
    if (!code) {
      return {
        errorMsg: 'No authentication code received from Spotify.',
        status: 'error' as const
      };
    }
    return {
      errorMsg: '',
      status: 'processing' as const
    };
  };

  const initialState = getInitialState();
  const [status, setStatus] = useState<'error' | 'processing' | 'success'>(initialState.status);
  const [errorMsg, setErrorMsg] = useState(initialState.errorMsg);

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
