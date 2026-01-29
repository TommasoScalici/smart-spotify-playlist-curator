import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, History, User, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityFeed, ActivityLog } from '@/hooks/useActivityFeed';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FirestoreService } from '@/services/firestore-service';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { DiffViewer } from '@/features/playlists/components/DiffViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Simple time ago formatter
const formatTimeAgo = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

interface ActivityFeedProps {
  isDrawer?: boolean;
  onClose?: () => void;
}

export const ActivityFeed = ({ isDrawer, onClose }: ActivityFeedProps) => {
  const { user } = useAuth();
  const { activities, loading } = useActivityFeed();
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  const handleActivityClick = (activity: ActivityLog) => {
    if (activity.type === 'success' && activity.metadata?.diff) {
      setSelectedActivity(activity);
      // Close side panel if it's open, so the modal is visible and doesn't get lost in blur
      if (isDrawer) {
        onClose?.();
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await FirestoreService.softDeleteActivity(user.uid, activityId);
      toast.success('Activity removed');
    } catch (error) {
      console.error('Failed to delete activity:', error);
      toast.error('Failed to remove activity');
    }
  };

  const handleClearAll = async () => {
    if (!user || activities.length === 0) return;

    const promise = FirestoreService.clearAllActivities(user.uid);
    toast.promise(promise, {
      loading: 'Clearing all activities...',
      success: 'Activity history cleared',
      error: 'Failed to clear activities'
    });
  };

  const content = (
    <div
      className={cn(
        'space-y-4 pr-2 overflow-y-auto custom-scrollbar',
        isDrawer ? 'h-full p-6' : 'max-h-[300px]'
      )}
    >
      {loading && (
        <div className="text-sm text-muted-foreground text-center py-4">Loading history...</div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          No activity yet. Trigger a playlist update!
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-[10px] h-7 gap-1.5 font-bold uppercase tracking-wider hover:bg-destructive/10 hover:text-destructive group/clear transition-all"
          >
            <Sparkles className="h-3 w-3 group-hover/clear:hidden" />
            <Trash2 className="h-3 w-3 hidden group-hover/clear:block" />
            Clear history
          </Button>
        </div>
      )}

      {activities.map((activity) => (
        <div
          key={activity.id}
          className={cn(
            'flex gap-3 items-start group/item animate-fade-in p-2 rounded-lg transition-all relative',
            activity.type === 'success' && activity.metadata?.diff
              ? 'cursor-pointer hover:bg-white/5'
              : ''
          )}
          onClick={() => handleActivityClick(activity)}
        >
          {/* Delete Button (Hover) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleDelete(e, activity.id)}
            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover/item:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity z-10"
          >
            <Trash2 className="h-3 w-3" />
          </Button>

          <div
            className={cn(
              'mt-1 h-2 w-2 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card',
              activity.type === 'success' && 'bg-green-500 ring-green-500/20',
              activity.type === 'warning' && 'bg-amber-500 ring-amber-500/20',
              activity.type === 'info' && 'bg-blue-500 ring-blue-500/20',
              activity.type === 'error' && 'bg-red-500 ring-red-500/20'
            )}
          />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
              {activity.message}
            </p>

            {/* Rich Metadata Badges */}
            {activity.type === 'success' && activity.metadata && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activity.metadata.addedCount ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                    +{activity.metadata.addedCount} Added
                  </span>
                ) : null}
                {activity.metadata.removedCount ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                    -{activity.metadata.removedCount} Removed
                  </span>
                ) : null}
                {activity.metadata.aiTracksAdded ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    {activity.metadata.aiTracksAdded} AI
                  </span>
                ) : null}
                {activity.metadata.duplicatesRemoved ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    -{activity.metadata.duplicatesRemoved} Duplicates
                  </span>
                ) : null}
                {activity.metadata.expiredRemoved ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    -{activity.metadata.expiredRemoved} Expired
                  </span>
                ) : null}
                {activity.metadata.artistLimitRemoved ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    -{activity.metadata.artistLimitRemoved} Artist Limit
                  </span>
                ) : null}
                {activity.metadata.sizeLimitRemoved ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-500 border border-pink-500/20">
                    -{activity.metadata.sizeLimitRemoved} Size Limit
                  </span>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Clock className="h-3 w-3" />
              <span>{formatTimeAgo(activity.timestamp)}</span>
              {activity.metadata?.triggeredBy && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-2.5 w-2.5 text-primary fill-primary/30" />
                    </div>
                    <span
                      className="wrap-break-word"
                      title={`Triggered by ${activity.metadata.triggeredBy}`}
                    >
                      {activity.metadata.triggeredBy}
                    </span>
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase px-1.5 rounded border leading-none py-0.5 tracking-wider',
                        activity.metadata.dryRun
                          ? 'border-amber-500/50 text-amber-500/80 bg-amber-500/10'
                          : 'border-green-500/50 text-green-500/80 bg-green-500/10'
                      )}
                    >
                      {activity.metadata.dryRun ? 'Test Run' : 'Applied on Spotify'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Report Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-w-7xl h-[85vh] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Curation Report: {selectedActivity?.metadata?.playlistName || 'Playlist'}
            </DialogTitle>
            <DialogDescription>
              Changes from {selectedActivity?.metadata?.dryRun ? 'test' : 'automation'} run at{' '}
              {selectedActivity && new Date(selectedActivity.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto md:overflow-hidden min-h-0 py-4 h-full pr-1">
            {selectedActivity?.metadata?.diff ? (
              <div className="flex flex-col h-full">
                <DiffViewer
                  diff={selectedActivity.metadata.diff}
                  isDryRun={selectedActivity.metadata.dryRun}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <History className="h-10 w-10 mb-2 opacity-50" />
                <p>No details available for this run.</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4">
            {selectedActivity?.metadata?.diff?.stats && (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground">
                <span>
                  Target:{' '}
                  <span className="text-foreground">
                    {selectedActivity.metadata.diff.stats.target}
                  </span>
                </span>
                <span className="opacity-20 text-lg leading-none">|</span>
                <span>
                  Final:{' '}
                  <span className="text-foreground">
                    {selectedActivity.metadata.diff.stats.final}
                  </span>
                </span>
                <span className="opacity-20 text-lg leading-none">|</span>
                <span className="flex items-center gap-1.5">
                  Success:
                  {selectedActivity.metadata.diff.stats.success ? (
                    <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-0 h-5 px-1.5">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="h-5 px-1.5">
                      No
                    </Badge>
                  )}
                </span>
              </div>
            )}
            <Button onClick={() => setSelectedActivity(null)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isDrawer) {
    return content;
  }

  return (
    <Card className="h-full border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {loading ? 'Connecting...' : 'Live Updates'}
          </span>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
