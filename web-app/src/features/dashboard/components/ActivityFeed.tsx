import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  ListMusic,
  Loader2,
  Sparkles,
  Trash2,
  User
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityDiffModal } from '@/features/dashboard/components/ActivityDiffModal';
import { ActivityLog, useActivityFeed } from '@/hooks/useActivityFeed';
import { cn } from '@/lib/utils';
import { FirestoreService } from '@/services/firestore-service';

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

// ...

interface ActivityFeedProps {
  isDrawer?: boolean;
  onActivitySelect?: (activity: ActivityLog) => void;
  onClose?: () => void;
}

export const ActivityFeed = ({ isDrawer, onActivitySelect, onClose }: ActivityFeedProps) => {
  const { user } = useAuth();
  const { activities, loading } = useActivityFeed();
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  const handleActivityClick = (activity: ActivityLog) => {
    if (onActivitySelect) {
      onActivitySelect(activity);
      onClose?.();
    } else {
      setSelectedActivity(activity);
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
      error: 'Failed to clear activities',
      loading: 'Clearing all activities...',
      success: 'Activity history cleared'
    });
  };

  const content = (
    <div
      className={cn(
        'custom-scrollbar space-y-4 overflow-y-auto pr-2',
        isDrawer ? 'h-full p-6' : 'max-h-[300px]'
      )}
    >
      {loading && (
        <div className="text-muted-foreground py-4 text-center text-sm">Loading history...</div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-muted-foreground py-4 text-center text-sm">
          No activity yet. Trigger a playlist update!
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="mb-2 flex justify-end">
          <Button
            className="hover:bg-destructive/10 hover:text-destructive group/clear h-7 gap-1.5 text-[10px] font-bold tracking-wider uppercase transition-all"
            onClick={handleClearAll}
            size="sm"
            variant="ghost"
          >
            <Sparkles className="h-3 w-3 group-hover/clear:hidden" />
            <Trash2 className="hidden h-3 w-3 group-hover/clear:block" />
            Clear history
          </Button>
        </div>
      )}

      {activities.map((activity) => {
        const meta = activity.metadata;
        const isError = activity.type === 'error' || meta?.state === 'error';
        const isSuccess = activity.type === 'success' || meta?.state === 'completed';
        const isRunning = meta?.state === 'running';

        const StateIcon = isError
          ? AlertCircle
          : isSuccess
            ? CheckCircle2
            : isRunning
              ? Loader2
              : Info;
        const stateColor = isError
          ? 'text-red-500'
          : isSuccess
            ? 'text-green-500'
            : isRunning
              ? 'text-blue-500'
              : 'text-zinc-500';
        const bgHoverColor = isError
          ? 'hover:bg-red-500/5'
          : isSuccess
            ? 'hover:bg-green-500/5'
            : isRunning
              ? 'hover:bg-blue-500/5'
              : 'hover:bg-white/5';

        return (
          <div
            className={cn(
              'group/item animate-fade-in relative flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-transparent p-3 transition-all hover:border-white/5',
              bgHoverColor
            )}
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
          >
            <Button
              className="hover:bg-destructive/20 hover:text-destructive absolute top-2 right-2 z-10 h-6 w-6 rounded-full opacity-0 transition-opacity group-hover/item:opacity-100"
              onClick={(e) => handleDelete(e, activity.id)}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-3 w-3" />
            </Button>

            {/* Header */}
            <div className="flex w-full items-center justify-between pr-6">
              <div className="flex min-w-0 items-center gap-2">
                <StateIcon
                  className={cn('h-4 w-4 shrink-0', stateColor, isRunning && 'animate-spin')}
                />
                <span className="truncate text-sm font-semibold">
                  {meta?.playlistName || 'Unknown Playlist'}
                </span>
              </div>
              <span
                className={cn(
                  'rounded border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase',
                  isError
                    ? 'border-red-500/20 bg-red-500/10 text-red-500'
                    : isSuccess
                      ? 'border-green-500/20 bg-green-500/10 text-green-500'
                      : isRunning
                        ? 'border-blue-500/20 bg-blue-500/10 text-blue-500'
                        : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'
                )}
              >
                {meta?.state || 'idle'}
              </span>
            </div>

            {/* Message */}
            <p className="text-muted-foreground pl-6 text-xs leading-snug">{activity.message}</p>

            {/* Rich Metadata Badges */}
            {meta && (
              <div className="mt-1 flex flex-wrap gap-1.5 pl-6">
                {meta.addedCount ? (
                  <span className="inline-flex items-center rounded border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-500">
                    +{meta.addedCount} Added
                  </span>
                ) : null}
                {meta.removedCount ? (
                  <span className="inline-flex items-center rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                    -{meta.removedCount} Removed
                  </span>
                ) : null}
                {meta.aiTracksAdded ? (
                  <span className="inline-flex items-center rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-500">
                    {meta.aiTracksAdded} AI
                  </span>
                ) : null}
                {meta.duplicatesRemoved ? (
                  <span className="inline-flex items-center rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                    -{meta.duplicatesRemoved} Dups
                  </span>
                ) : null}
                {meta.expiredRemoved ? (
                  <span className="inline-flex items-center rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                    -{meta.expiredRemoved} Expired
                  </span>
                ) : null}
                {meta.artistLimitRemoved ? (
                  <span className="inline-flex items-center rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500">
                    -{meta.artistLimitRemoved} Artist Limit
                  </span>
                ) : null}
                {meta.sizeLimitRemoved ? (
                  <span className="inline-flex items-center rounded border border-pink-500/20 bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-pink-500">
                    -{meta.sizeLimitRemoved} Size Limit
                  </span>
                ) : null}
              </div>
            )}

            {/* Footer Info */}
            <div className="text-muted-foreground flex w-full flex-wrap items-center gap-2 pt-2 pl-6 text-[10px] font-medium">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(activity.timestamp)}</span>
              </div>

              {meta?.triggeredBy && (
                <div className="flex items-center gap-1">
                  <span className="opacity-50">•</span>
                  <User className="h-3 w-3" />
                  <span
                    className="max-w-[100px] truncate"
                    title={`Triggered by ${meta.triggeredBy}`}
                  >
                    {meta.triggeredBy}
                  </span>
                </div>
              )}

              {meta?.finalCount !== undefined && meta?.finalCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="opacity-50">•</span>
                  <ListMusic className="h-3 w-3" />
                  <span>{meta.finalCount} tracks</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Report Modal (Local state for non-drawer usage) */}
      <ActivityDiffModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        open={!!selectedActivity}
      />
    </div>
  );

  if (isDrawer) {
    return content;
  }

  return (
    <Card className="border-l-primary/20 h-full border-l-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="text-primary h-5 w-5" />
            Recent Activity
          </CardTitle>
          <span className="text-muted-foreground text-xs">
            {loading ? 'Connecting...' : 'Live Updates'}
          </span>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
