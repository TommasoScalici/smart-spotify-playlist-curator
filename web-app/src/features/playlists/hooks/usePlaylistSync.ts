import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import { FunctionsService } from '@/services/functions-service';

export interface UsePlaylistSyncProps {
  getValues: UseFormGetValues<PlaylistConfig>;
  imageUrl?: null | string;
  playlistId?: string;
  playlistName?: string;
  setValue: UseFormSetValue<PlaylistConfig>;
}

export function usePlaylistSync({
  getValues,
  imageUrl,
  playlistId,
  playlistName,
  setValue
}: UsePlaylistSyncProps) {
  // Fetch playlist meta if we have ID but missing name or image
  const shouldFetchPlaylist =
    !!playlistId && playlistId.startsWith('spotify:playlist:') && (!playlistName || !imageUrl);

  const { data: fetchedPlaylist } = useQuery({
    enabled: shouldFetchPlaylist,
    queryFn: async () => {
      if (!playlistId) return null;
      const results = await FunctionsService.searchSpotify(playlistId, 'playlist');
      return results && results.length > 0 ? results[0] : null;
    },
    queryKey: ['spotify', 'playlist', playlistId],
    staleTime: 1000 * 60 * 30 // 30 mins
  });

  // Basic one-way sync
  useEffect(() => {
    if (fetchedPlaylist) {
      if (!getValues('name')) {
        setValue('name', fetchedPlaylist.name);
      }
      if (!getValues('imageUrl')) {
        setValue('imageUrl', fetchedPlaylist.imageUrl);
      }
    }
  }, [fetchedPlaylist, getValues, setValue]);

  return { fetchedPlaylist };
}
