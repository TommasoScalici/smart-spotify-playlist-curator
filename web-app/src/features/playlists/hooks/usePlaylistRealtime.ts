import { ActivityLog, PlaylistConfig } from '@smart-spotify-curator/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { FirestoreService } from '@/services/firestore-service';
import { FunctionsService } from '@/services/functions-service';

export interface UsePlaylistRealtimeProps {
  config: { _docId: string } & PlaylistConfig;
}

export function usePlaylistRealtime({ config }: UsePlaylistRealtimeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOptimisticallyRunning, setIsOptimisticallyRunning] = useState(false);
  const [latestLog, setLatestLog] = useState<ActivityLog | null>(null);
  const [isLoadingLog, setIsLoadingLog] = useState(true);

  // 1. Fetch Playlist Metrics (Followers, Tracks, etc.)
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    enabled: !!config.id,
    queryFn: () => FunctionsService.getPlaylistMetrics(config.id),
    queryKey: ['playlistMetrics', config.id],
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // 2. Real-time Log & Progress Subscription
  useEffect(() => {
    if (!user?.uid || !config.id) return;

    const unsubscribe = FirestoreService.subscribeLatestLog(user.uid, config.id, (log) => {
      setLatestLog(log);
      setIsLoadingLog(false);
    });

    return () => unsubscribe();
  }, [user?.uid, config.id]);

  // 3. Sync optimistic state with real log state
  // Reset optimistic flag if we see the real run has started
  if (latestLog?.metadata?.state === 'running' && isOptimisticallyRunning) {
    setIsOptimisticallyRunning(false);
  }

  // 4. Mutation: Toggle Enabled/Disabled
  const toggleEnabledMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.uid) throw new Error('User not authenticated');
      await FirestoreService.saveUserPlaylist(user.uid, { ...config, enabled }, config._docId);
    },
    onError: (error: Error) => {
      console.error('Toggle failed:', error);
      toast.error('Failed to update playlist', {
        description: 'Please try again later.'
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success(enabled ? 'Playlist enabled' : 'Playlist disabled', {
        description: `"${config.name}" automation is now ${enabled ? 'active' : 'paused'}.`
      });
    }
  });

  // 5. Mutation: Delete Playlist
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      await FirestoreService.deleteUserPlaylist(user.uid, config._docId);
    },
    onError: (error) => {
      console.error('Delete failed:', error);
      toast.error('Failed to delete playlist', {
        description: 'Please try again later.'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist removed from app', {
        description: `"${config.name}" has been deleted from your Smart Curator dashboard.`
      });
    }
  });

  // Derived Values
  const lastUpdated = metrics?.lastUpdated;
  const lastUpdatedText = useMemo(() => {
    return lastUpdated ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true }) : '—';
  }, [lastUpdated]);

  return {
    deletePlaylist: () => deleteMutation.mutate(),
    isDeleting: deleteMutation.isPending,
    isLoadingLog,
    isLoadingMetrics,
    isOptimisticallyRunning,
    isToggling: toggleEnabledMutation.isPending,
    lastUpdatedText,
    latestLog,
    metrics,
    setIsOptimisticallyRunning,
    toggleEnabled: (enabled: boolean) => toggleEnabledMutation.mutate(enabled)
  };
}
