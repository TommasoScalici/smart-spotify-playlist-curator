import { useQuery } from '@tanstack/react-query';
import { FirestoreService } from '../services/firestore-service';

export const useSpotifyStatus = (uid: string | undefined) => {
  return useQuery({
    queryKey: ['spotifyConnection', uid],
    queryFn: async () => {
      if (!uid) return { isLinked: false, profile: null };
      const [connectionStatus, profile] = await Promise.all([
        FirestoreService.checkSpotifyConnection(uid),
        FirestoreService.getSpotifyProfile(uid)
      ]);
      return {
        isLinked: connectionStatus.isLinked,
        authError: connectionStatus.authError,
        profile
      };
    },
    enabled: !!uid,
    staleTime: Infinity
  });
};
