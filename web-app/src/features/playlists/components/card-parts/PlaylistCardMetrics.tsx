import { Calendar, Music, Users } from 'lucide-react';

import { CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlaylistCardMetricsProps {
  isLoading: boolean;
  followers?: number;
  lastUpdatedText: string;
  lastUpdatedDate?: string | null;
  tracks?: number;
}

export const PlaylistCardMetrics = ({
  isLoading,
  followers,
  lastUpdatedText,
  lastUpdatedDate,
  tracks
}: PlaylistCardMetricsProps) => {
  return (
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
                  {isLoading ? <span className="animate-pulse">—</span> : (followers ?? '—')}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{followers?.toLocaleString() ?? 0} followers on Spotify</p>
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
                    <span className="wrap-break-word">{lastUpdatedText}</span>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Latest track addition or curation:{' '}
                {lastUpdatedDate
                  ? new Date(lastUpdatedDate).toLocaleString()
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
                  {isLoading ? <span className="animate-pulse">—</span> : (tracks ?? '—')}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tracks ?? 0} tracks currently in playlist</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardContent>
  );
};
