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
  const [lastManualTriggerAt, setLastManualTriggerAt] = useState<null | number>(null);
  const [latestLog, setLatestLog] = useState<ActivityLog | null>(null);
  const [isLoadingLog, setIsLoadingLog] = useState(true);

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    enabled: !!config.id,
    queryFn: () => FunctionsService.getPlaylistMetrics(config.id),
    queryKey: ['playlistMetrics', config.id],
    retry: 1,
    staleTime: 1000 * 60 * 5
  });

  useEffect(() => {
    if (!user?.uid || !config.id) return;

    const unsubscribe = FirestoreService.subscribeLatestLog(user.uid, config.id, (log) => {
      setLatestLog(log);
      setIsLoadingLog(false);
    });

    return () => unsubscribe();
  }, [user?.uid, config.id]);

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

  const lastUpdated = metrics?.lastUpdated;
  const lastUpdatedText = useMemo(() => {
    return lastUpdated ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true }) : '—';
  }, [lastUpdated]);

  const logTimestamp = latestLog?.timestamp;
  const logMillis = logTimestamp
    ? logTimestamp.seconds * 1000 + (logTimestamp.nanoseconds || 0) / 1000000
    : 0;

  const isOptimisticallyRunning =
    lastManualTriggerAt !== null &&
    logMillis < lastManualTriggerAt &&
    latestLog?.metadata?.state !== 'completed' &&
    latestLog?.metadata?.state !== 'error';

  const isRunning = latestLog?.metadata?.state === 'running' || isOptimisticallyRunning;

  return {
    deletePlaylist: () => deleteMutation.mutate(),
    isDeleting: deleteMutation.isPending,
    isLoadingLog,
    isLoadingMetrics,
    isOptimisticallyRunning: isRunning,
    isToggling: toggleEnabledMutation.isPending,
    lastUpdatedText,
    latestLog,
    metrics,
    setIsOptimisticallyRunning: (val: boolean) => setLastManualTriggerAt(val ? Date.now() : null),
    toggleEnabled: (enabled: boolean) => toggleEnabledMutation.mutate(enabled)
  };
}
