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
      <div className="grid grid-cols-3 gap-2 rounded-lg border-y border-white/5 bg-black/5 py-3">
        <TooltipProvider>
          {/* Followers */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help flex-col items-center justify-center p-1 text-center">
                <span className="text-muted-foreground mb-1 text-[10px] font-medium tracking-tight uppercase">
                  Followers
                </span>
                <div className="text-foreground flex items-center gap-1 text-sm font-bold">
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
              <div className="flex cursor-help flex-col items-center justify-center border-x border-white/5 p-1 text-center">
                <span className="text-muted-foreground mb-1 text-[10px] font-medium tracking-tight uppercase">
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
              <div className="flex cursor-help flex-col items-center justify-center p-1 text-center">
                <span className="text-muted-foreground mb-1 text-[10px] font-medium tracking-tight uppercase">
                  Tracks
                </span>
                <div className="text-foreground flex items-center gap-1 text-sm font-bold">
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
