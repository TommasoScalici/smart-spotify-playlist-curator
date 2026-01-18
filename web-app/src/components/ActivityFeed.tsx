import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityFeed } from '../hooks/useActivityFeed';

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

export const ActivityFeed = () => {
  const { activities, loading } = useActivityFeed();

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
      <CardContent>
        <div className="space-y-4 pr-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="text-sm text-muted-foreground text-center py-4">Loading history...</div>
          )}

          {!loading && activities.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No activity yet. Trigger a playlist update!
            </div>
          )}

          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 items-start group animate-fade-in">
              <div
                className={cn(
                  'mt-1 h-2 w-2 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card',
                  activity.type === 'success' && 'bg-green-500 ring-green-500/20',
                  activity.type === 'warning' && 'bg-amber-500 ring-amber-500/20',
                  activity.type === 'info' && 'bg-blue-500 ring-blue-500/20',
                  activity.type === 'error' && 'bg-red-500 ring-red-500/20'
                )}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                  {activity.message}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                  {typeof activity.metadata?.playlistId === 'string' && (
                    <>
                      <span>•</span>
                      <Music className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">{activity.metadata.playlistId}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
