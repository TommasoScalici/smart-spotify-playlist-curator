import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { ActivityLog, PlaylistConfig } from '@smart-spotify-curator/shared';
import { useAuth } from '@/contexts/AuthContext';
import { FirestoreService } from '@/services/firestore-service';
import { FunctionsService } from '@/services/functions-service';

export interface UsePlaylistRealtimeProps {
  config: PlaylistConfig & { _docId: string };
}

export function usePlaylistRealtime({ config }: UsePlaylistRealtimeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOptimisticallyRunning, setIsOptimisticallyRunning] = useState(false);
  const [latestLog, setLatestLog] = useState<ActivityLog | null>(null);
  const [isLoadingLog, setIsLoadingLog] = useState(true);

  // 1. Fetch Playlist Metrics (Followers, Tracks, etc.)
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['playlistMetrics', config.id],
    queryFn: () => FunctionsService.getPlaylistMetrics(config.id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    enabled: !!config.id
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
  useEffect(() => {
    if (latestLog?.metadata?.state === 'running') {
      setIsOptimisticallyRunning(false);
    }
  }, [latestLog?.metadata?.state]);

  // 4. Mutation: Toggle Enabled/Disabled
  const toggleEnabledMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.uid) throw new Error('User not authenticated');
      await FirestoreService.saveUserPlaylist(user.uid, { ...config, enabled }, config._docId);
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success(enabled ? 'Playlist enabled' : 'Playlist disabled', {
        description: `"${config.name}" automation is now ${enabled ? 'active' : 'paused'}.`
      });
    },
    onError: (error: Error) => {
      console.error('Toggle failed:', error);
      toast.error('Failed to update playlist', {
        description: 'Please try again later.'
      });
    }
  });

  // 5. Mutation: Delete Playlist
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      await FirestoreService.deleteUserPlaylist(user.uid, config._docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist removed from app', {
        description: `"${config.name}" has been deleted from your Smart Curator dashboard.`
      });
    },
    onError: (error) => {
      console.error('Delete failed:', error);
      toast.error('Failed to delete playlist', {
        description: 'Please try again later.'
      });
    }
  });

  // 6. Action: Run Test Curation (Dry Run)
  const runTestCuration = async () => {
    setIsOptimisticallyRunning(true);
    const toastId = toast.loading('Running test curation...');
    try {
      const result = await FunctionsService.triggerCuration(config.id, {
        dryRun: true
      });

      const errorResult = result.results.find((r) => r.status === 'error');

      if (errorResult) {
        toast.error('Test run failed', {
          id: toastId,
          description: errorResult.error || 'Unknown error occurred during curation.'
        });
      } else {
        toast.success('Test run complete!', {
          id: toastId,
          description: 'Check the "History" button to see the proposed changes.'
        });
      }
    } catch (err) {
      toast.error('Failed to start test run', {
        id: toastId,
        description: (err as Error).message
      });
    } finally {
      setIsOptimisticallyRunning(false);
    }
  };

  // Derived Values
  const lastUpdatedText = useMemo(() => {
    return metrics?.lastUpdated
      ? formatDistanceToNow(new Date(metrics.lastUpdated), { addSuffix: true })
      : '—';
  }, [metrics?.lastUpdated]);

  return {
    metrics,
    isLoadingMetrics,
    latestLog,
    isLoadingLog,
    isOptimisticallyRunning,
    lastUpdatedText,
    toggleEnabled: (enabled: boolean) => toggleEnabledMutation.mutate(enabled),
    isToggling: toggleEnabledMutation.isPending,
    deletePlaylist: () => deleteMutation.mutate(),
    isDeleting: deleteMutation.isPending,
    runTestCuration,
    setIsOptimisticallyRunning
  };
}
