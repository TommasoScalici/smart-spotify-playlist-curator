import { useQuery } from '@tanstack/react-query';
import { FirestoreService } from '../services/firestore-service';

export const useSpotifyStatus = (uid: string | undefined) => {
  return useQuery({
    queryKey: ['spotifyConnection', uid],
    queryFn: () => {
      if (!uid) return false;
      return FirestoreService.checkSpotifyConnection(uid);
    },
    enabled: !!uid,
    staleTime: Infinity // Connection status doesn't change often unless we explicitely change it
  });
};
