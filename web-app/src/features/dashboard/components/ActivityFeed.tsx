import { Activity, Clock, Sparkles, Trash2, User } from 'lucide-react';
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
    if (activity.type === 'success' && activity.metadata?.diff) {
      if (onActivitySelect) {
        onActivitySelect(activity);
        onClose?.();
      } else {
        setSelectedActivity(activity);
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

      {activities.map((activity) => (
        <div
          className={cn(
            'group/item animate-fade-in relative flex items-start gap-3 rounded-lg p-2 transition-all',
            activity.type === 'success' && activity.metadata?.diff
              ? 'cursor-pointer hover:bg-white/5'
              : ''
          )}
          key={activity.id}
          onClick={() => handleActivityClick(activity)}
        >
          {/* Delete Button (Hover) */}
          <Button
            className="hover:bg-destructive/20 hover:text-destructive absolute top-1 right-1 z-10 h-6 w-6 rounded-full opacity-0 transition-opacity group-hover/item:opacity-100"
            onClick={(e) => handleDelete(e, activity.id)}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="h-3 w-3" />
          </Button>

          <div
            className={cn(
              'ring-offset-card mt-1 h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-2',
              activity.type === 'success' && 'bg-green-500 ring-green-500/20',
              activity.type === 'warning' && 'bg-amber-500 ring-amber-500/20',
              activity.type === 'info' && 'bg-blue-500 ring-blue-500/20',
              activity.type === 'error' && 'bg-red-500 ring-red-500/20'
            )}
          />
          <div className="flex-1 space-y-1">
            <p className="group-hover:text-primary text-sm leading-none font-medium transition-colors">
              {activity.message}
            </p>

            {/* Rich Metadata Badges */}
            {activity.type === 'success' && activity.metadata && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activity.metadata.addedCount ? (
                  <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-500">
                    +{activity.metadata.addedCount} Added
                  </span>
                ) : null}
                {activity.metadata.removedCount ? (
                  <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                    -{activity.metadata.removedCount} Removed
                  </span>
                ) : null}
                {activity.metadata.aiTracksAdded ? (
                  <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-500">
                    {activity.metadata.aiTracksAdded} AI
                  </span>
                ) : null}
                {activity.metadata.duplicatesRemoved ? (
                  <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                    -{activity.metadata.duplicatesRemoved} Duplicates
                  </span>
                ) : null}
                {activity.metadata.expiredRemoved ? (
                  <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                    -{activity.metadata.expiredRemoved} Expired
                  </span>
                ) : null}
                {activity.metadata.artistLimitRemoved ? (
                  <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-500">
                    -{activity.metadata.artistLimitRemoved} Artist Limit
                  </span>
                ) : null}
                {activity.metadata.sizeLimitRemoved ? (
                  <span className="inline-flex items-center rounded-full border border-pink-500/20 bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-bold text-pink-500">
                    -{activity.metadata.sizeLimitRemoved} Size Limit
                  </span>
                ) : null}
              </div>
            )}

            <div className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{formatTimeAgo(activity.timestamp)}</span>
              {activity.metadata?.triggeredBy && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-primary/20 flex h-4 w-4 items-center justify-center rounded-full">
                      <User className="text-primary fill-primary/30 h-2.5 w-2.5" />
                    </div>
                    <span
                      className="wrap-break-word"
                      title={`Triggered by ${activity.metadata.triggeredBy}`}
                    >
                      {activity.metadata.triggeredBy}
                    </span>
                    <span
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[9px] leading-none font-black tracking-wider uppercase',
                        activity.metadata.dryRun
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-500/80'
                          : 'border-green-500/50 bg-green-500/10 text-green-500/80'
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
