import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { useEffect, useState } from 'react';

import { useSpotifyStatus } from '@/features/auth/hooks/useSpotifyStatus';
import { FirestoreService } from '@/services/firestore-service';

export function useDashboard(userUid?: string) {
  const [playlists, setPlaylists] = useState<({ _docId: string } & PlaylistConfig)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tutorialDismissed, setTutorialDismissed] = useState(() => {
    return localStorage.getItem('tutorial_dismissed') === 'true';
  });

  const { data, isLoading: checkingLink } = useSpotifyStatus(userUid);
  const isSpotifyLinked = data?.isLinked;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (userUid && isSpotifyLinked) {
      queueMicrotask(() => {
        setLoading(true);
        setError('');
      });

      unsubscribe = FirestoreService.subscribeUserPlaylists(userUid, (data) => {
        setPlaylists(data);
        setLoading(false);
      });
    } else {
      queueMicrotask(() => setLoading(false));
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userUid, isSpotifyLinked]);

  const handleDismissTutorial = () => {
    setTutorialDismissed(true);
    localStorage.setItem('tutorial_dismissed', 'true');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return {
    checkingLink,
    error,
    handleDismissTutorial,
    handleRetry,
    isSpotifyLinked,
    loading,
    playlists,
    tutorialDismissed
  };
}
