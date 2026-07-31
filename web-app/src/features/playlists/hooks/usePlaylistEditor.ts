import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { FirestoreService } from '@/services/firestore-service';

export function usePlaylistEditor(id?: string, userUid?: string) {
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [loading, setLoading] = useState(id !== 'new');
  const [config, setConfig] = useState<PlaylistConfig | undefined>(undefined);

  const loadConfig = useCallback(
    async (docId: string, uid: string) => {
      try {
        const playlist = await FirestoreService.getUserPlaylistById(uid, docId);
        if (playlist) {
          if (
            playlist.aiGeneration &&
            (playlist.aiGeneration.model === 'gemini-2.5-flash' || !playlist.aiGeneration.model)
          ) {
            playlist.aiGeneration.model = 'gemini-3.6-flash';
          }
          setConfig(playlist);
        } else {
          toast.error('Playlist not found', {
            description: 'The requested playlist configuration could not be loaded.'
          });
          navigate('/');
        }
      } catch {
        toast.error('Error loading playlist', {
          description: 'Please check your internet connection and try again.'
        });
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!userUid) return;

    if (id && id !== 'new') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadConfig(id, userUid);
    }
  }, [id, userUid, loadConfig]);

  const handleSave = async (data: PlaylistConfig) => {
    if (!userUid) return;

    toast.promise(FirestoreService.saveUserPlaylist(userUid, data, isNew ? undefined : id), {
      error: 'Failed to save playlist. Please try again.',
      loading: 'Saving configuration...',
      success: () => {
        navigate('/');
        return 'Playlist saved successfully! 💾';
      }
    });
  };

  const handleCancel = () => {
    navigate('/');
  };

  return {
    config,
    handleCancel,
    handleSave,
    isNew,
    loading
  };
}
