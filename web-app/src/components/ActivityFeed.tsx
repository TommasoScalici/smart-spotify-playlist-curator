import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock Data for now as per plan
const MOCK_ACTIVITIES = [
  {
    id: '1',
    type: 'success',
    message: 'Added "Midnight City" by M83',
    timestamp: '2 mins ago',
    playlist: 'Synthwave Essentials'
  },
  {
    id: '2',
    type: 'info',
    message: 'Scanned 50 tracks for duplication',
    timestamp: '5 mins ago',
    playlist: 'Synthwave Essentials'
  },
  {
    id: '3',
    type: 'success',
    message: 'Playlist "Morning Coffee" updated successfully',
    timestamp: '1 hour ago',
    playlist: 'Morning Coffee'
  },
  {
    id: '4',
    type: 'warning',
    message: 'Skipped track "Unknown" (No ID found)',
    timestamp: '3 hours ago',
    playlist: 'Discover Weekly Archive'
  }
];

export const ActivityFeed = () => {
  return (
    <Card className="h-full border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">Live Updates</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 pr-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {MOCK_ACTIVITIES.map((activity) => (
            <div key={activity.id} className="flex gap-3 items-start group">
              <div
                className={cn(
                  'mt-1 h-2 w-2 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card',
                  activity.type === 'success' && 'bg-green-500 ring-green-500/20',
                  activity.type === 'warning' && 'bg-amber-500 ring-amber-500/20',
                  activity.type === 'info' && 'bg-blue-500 ring-blue-500/20'
                )}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                  {activity.message}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{activity.timestamp}</span>
                  <span>•</span>
                  <Music className="h-3 w-3" />
                  <span>{activity.playlist}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2 text-center">
            <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View Full History
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
