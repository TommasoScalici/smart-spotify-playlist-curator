import { useNavigate } from 'react-router-dom';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Edit2, Music, Calendar, Users, Radio, Trash2, History, FlaskConical } from 'lucide-react';
import { RunButton } from './RunButton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FunctionsService } from '@/services/functions-service';
import { FirestoreService } from '@/services/firestore-service';
import { formatDistanceToNow } from 'date-fns';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { DiffViewer } from './DiffViewer';

interface PlaylistCardProps {
  config: PlaylistConfig & { _docId: string };
}

/**
 * Generates a deterministic gradient class based on playlist ID and enabled state.
 * @param id - Playlist ID for deterministic color selection
 * @param enabled - Whether the playlist is enabled
 * @returns Tailwind gradient class string
 */
const getMoodGradient = (id: string, enabled: boolean) => {
  if (!enabled) return 'from-gray-500/10 to-gray-900/10';

  const gradients = [
    'from-violet-600/20 via-purple-900/20 to-blue-900/20', // Deep Space
    'from-emerald-500/20 via-green-900/20 to-teal-900/20', // Toxic/Cyber
    'from-rose-500/20 via-red-900/20 to-orange-900/20', // Heat
    'from-blue-500/20 via-cyan-900/20 to-slate-900/20', // Ice
    'from-amber-500/20 via-orange-900/20 to-yellow-900/20' // Solar
  ];

  const charCode = id.charCodeAt(0) + id.length;
  return gradients[charCode % gradients.length];
};

export const PlaylistCard = ({ config }: PlaylistCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['playlistMetrics', config.id],
    queryFn: () => FunctionsService.getPlaylistMetrics(config.id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });

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
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      console.error('Delete failed:', error);
      toast.error('Failed to delete playlist', {
        description: 'Please try again later.'
      });
    }
  });

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
    onError: (error) => {
      console.error('Toggle failed:', error);
      toast.error('Failed to update playlist', {
        description: 'Please try again later.'
      });
    }
  });

  const gradientClass = useMemo(
    () => getMoodGradient(config.id, config.enabled),
    [config.id, config.enabled]
  );

  const lastUpdatedText = metrics?.lastUpdated
    ? formatDistanceToNow(new Date(metrics.lastUpdated), { addSuffix: true })
    : '—';

  return (
    <Card
      className={cn(
        'group relative overflow-hidden flex flex-col h-full min-h-[260px] border-0 transition-all duration-500',
        'hover:shadow-2xl hover:-translate-y-1',
        // Glassmorphism Base
        'bg-card/40 backdrop-blur-xl',
        // Border Gradient Trick
        'before:absolute before:inset-0 before:p-[1px] before:-z-10 before:rounded-xl before:bg-gradient-to-b before:from-white/10 before:to-white/5',
        !config.enabled && 'opacity-60 grayscale-[0.8] hover:grayscale-0'
      )}
    >
      {/* Dynamic Background Mesh */}
      <div
        className={cn(
          'absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-60 bg-gradient-to-br',
          gradientClass
        )}
      />

      {/* Header Area */}
      <div className="relative p-5 flex gap-4 items-start z-10">
        {/* Album Art with Glow */}
        <div className="relative shrink-0">
          <div className="h-20 w-20 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-500">
            {config.imageUrl || metrics?.imageUrl ? (
              <img
                src={config.imageUrl || metrics?.imageUrl || ''}
                alt={config.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-black/40 flex items-center justify-center">
                <Music className="h-8 w-8 text-white/50" />
              </div>
            )}
          </div>
          {/* Pulsing Status Dot */}
          {config.enabled && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background"></span>
            </span>
          )}
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="text-xl font-bold tracking-tight text-foreground leading-tight line-clamp-1 md:line-clamp-2 drop-shadow-sm group-hover:text-primary transition-colors cursor-help">
                  {config.name}
                </h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="h-3 w-3" />
            {metrics?.owner || 'Smart Curator'}
          </p>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground/80 mt-2 line-clamp-2 md:line-clamp-3 cursor-help hover:text-foreground transition-colors">
                  {config.settings.description || 'Automation rules active'}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p className="max-w-xs">
                  {config.settings.description || 'No description provided.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Enable/Disable Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {toggleEnabledMutation.isPending && (
                  <div className="animate-spin h-3 w-3 rounded-full border-2 border-primary border-t-transparent" />
                )}
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => toggleEnabledMutation.mutate(checked)}
                  disabled={toggleEnabledMutation.isPending}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{config.enabled ? 'Disable automation' : 'Enable automation'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Metrics Grid */}
      <CardContent className="relative z-10 p-5 pt-0">
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 bg-black/5 rounded-lg">
          <TooltipProvider>
            {/* Followers */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center justify-center text-center p-1 cursor-help">
                  <span className="text-[10px] text-muted-foreground font-medium mb-1 uppercase tracking-tight">
                    Followers
                  </span>
                  <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                    <Users className="h-3 w-3 text-sky-400" />
                    {isLoading ? (
                      <span className="animate-pulse">—</span>
                    ) : (
                      (metrics?.followers ?? '—')
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{metrics?.followers?.toLocaleString() ?? 0} followers on Spotify</p>
              </TooltipContent>
            </Tooltip>

            {/* Last Activity */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center justify-center text-center p-1 border-x border-white/5 cursor-help">
                  <span className="text-[10px] text-muted-foreground font-medium mb-1 uppercase tracking-tight">
                    Activity
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Calendar className="h-3 w-3" />
                    {isLoading ? (
                      <span className="animate-pulse">—</span>
                    ) : (
                      <span className="truncate max-w-[65px]">{lastUpdatedText}</span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Latest track addition or curation:{' '}
                  {metrics?.lastUpdated
                    ? new Date(metrics.lastUpdated).toLocaleString()
                    : 'No activity recorded'}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Tracks */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center justify-center text-center p-1 cursor-help">
                  <span className="text-[10px] text-muted-foreground font-medium mb-1 uppercase tracking-tight">
                    Tracks
                  </span>
                  <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                    <Music className="h-3 w-3 text-purple-400" />
                    {isLoading ? (
                      <span className="animate-pulse">—</span>
                    ) : (
                      (metrics?.tracks ?? '—')
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{metrics?.tracks ?? 0} tracks currently in playlist</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>

      <CardFooter className="relative z-10 p-5 pt-2 mt-auto flex gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Edit playlist settings"
          className="group/btn border-white/10 bg-white/5 text-muted-foreground hover:text-secondary hover:bg-secondary/10 hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/10 hover:scale-105 active:scale-95 transition-all h-10 w-10 min-h-[44px] min-w-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/playlist/${config._docId}`);
          }}
        >
          <Edit2 className="h-4 w-4 transition-transform group-hover/btn:-rotate-12" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label="Delete playlist"
          className="group/del border-white/10 bg-white/5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-lg hover:shadow-destructive/10 hover:scale-105 active:scale-95 transition-all h-10 w-10 min-h-[44px] min-w-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteDialog(true);
          }}
        >
          <Trash2 className="h-4 w-4 transition-transform group-hover/del:scale-110" />
        </Button>

        <div className="flex-1 flex flex-col justify-center min-h-[44px]">
          {config.curationStatus?.state === 'running' ? (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between text-[10px] items-center px-0.5">
                <span className="font-semibold text-primary animate-pulse uppercase tracking-wider">
                  {config.curationStatus.step || 'Curating...'}
                </span>
                <span className="font-mono text-muted-foreground">
                  {config.curationStatus.progress}%
                </span>
              </div>
              <Progress value={config.curationStatus.progress} className="h-1.5 bg-secondary/50" />
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <RunButton
                playlistId={config.id}
                className="flex-1 h-10 min-h-[44px]"
                disabled={!config.enabled}
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Start test run"
                      className="border-white/10 bg-white/5 text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30 transition-all h-10 w-10 min-h-[44px] min-w-[44px]"
                      onClick={async (e) => {
                        e.stopPropagation();

                        const toastId = toast.loading('Running test curation...');
                        try {
                          const result = await FunctionsService.triggerCuration(config.id, {
                            dryRun: true
                          });

                          // Check for functional errors (the cloud function completed, but returned an error status)
                          const errorResult = result.results.find((r) => r.status === 'error');

                          if (errorResult) {
                            toast.error('Test run failed', {
                              id: toastId,
                              description:
                                errorResult.error || 'Unknown error occurred during curation.'
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
                        }
                      }}
                    >
                      <FlaskConical className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Test Run (Dry Run) - See changes without saving</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {config.curationStatus?.diff && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="View curation history"
                  className={cn(
                    'border-white/10 bg-white/5 text-muted-foreground transition-all h-10 w-10 min-h-[44px] min-w-[44px]',
                    // Highlight history button if it was a dry run to encourage checking results
                    config.curationStatus.isDryRun
                      ? 'hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30 text-amber-500/80'
                      : 'hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHistory(true);
                  }}
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardFooter>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist from App?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>"{config.name}"</strong> from your Smart Curator dashboard.
              <br />
              <br />
              <strong>Your Spotify playlist will NOT be affected.</strong> This only deletes the
              automation configuration from this app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete from App'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History / Diff Dialog */}
      {config.curationStatus?.diff && (
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Curation History: {config.name}</DialogTitle>
              <DialogDescription>
                Changes applied during the last run (
                {metrics?.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : 'Just now'}
                )
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden min-h-0 py-4">
              <DiffViewer
                diff={config.curationStatus.diff}
                isDryRun={config.curationStatus.isDryRun}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => setShowHistory(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export const PlaylistCardSkeleton = () => (
  <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm h-full">
    <div className="h-40 w-full bg-muted animate-pulse" />
    <CardContent className="p-4 space-y-3">
      <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
      <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
      <div className="flex justify-between pt-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    </CardContent>
  </Card>
);
