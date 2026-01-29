import { useQuery } from '@tanstack/react-query';

import { MOCK_SPOTIFY_PROFILE } from '../mocks/spotify-mock-data';
import { FirestoreService } from '../services/firestore-service';

const IS_DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';
const DEBUG_SHOW_HERO = import.meta.env.VITE_DEBUG_SHOW_HERO === 'true';

export const useSpotifyStatus = (uid: string | undefined) => {
  return useQuery({
    queryKey: ['spotifyConnection', uid],
    queryFn: async () => {
      // Debug Mode: Return mock connection status
      if (IS_DEBUG_MODE) {
        console.warn('[SPOTIFY STATUS] Debug Mode: Returning Mock Connection Status');
        return {
          isLinked: !DEBUG_SHOW_HERO, // If showing hero, pretend not linked
          authError: false,
          profile: DEBUG_SHOW_HERO ? null : MOCK_SPOTIFY_PROFILE
        };
      }

      if (!uid) return { isLinked: false, profile: null };
      const connectionStatus = await FirestoreService.checkSpotifyConnection(uid);
      const profile = await FirestoreService.getSpotifyProfile(uid);
      return {
        isLinked: connectionStatus.isLinked,
        authError: connectionStatus.authError,
        profile
      };
    },
    enabled: !!uid || IS_DEBUG_MODE,
    staleTime: 1000 * 60 // 1 Minute
  });
};
