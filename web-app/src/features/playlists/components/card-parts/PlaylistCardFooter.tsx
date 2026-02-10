import { ActivityLog, PlaylistConfig } from '@smart-spotify-curator/shared';
import { Edit2, History, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import { RunButton } from '../RunButton';

interface PlaylistCardFooterProps {
  config: { _docId: string } & PlaylistConfig;
  isOptimisticallyRunning: boolean;
  latestLog: ActivityLog | null;
  onDelete: () => void;
  onEdit: () => void;
  onRunComplete: () => void;
  onRunStart: () => void;
  onShowHistory: () => void;
}

export const PlaylistCardFooter = ({
  config,
  isOptimisticallyRunning,
  latestLog,
  onDelete,
  onEdit,
  onRunComplete,
  onRunStart,
  onShowHistory
}: PlaylistCardFooterProps) => {
  const isRunning = latestLog?.metadata?.state === 'running' || isOptimisticallyRunning;
  const isError = latestLog?.metadata?.state === 'error';

  return (
    <CardFooter className="relative z-10 mt-auto flex gap-3 p-5 pt-2">
      <div className="flex min-h-[44px] flex-1 flex-col justify-center">
        {isRunning || isError ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-1.5 duration-300">
            <div className="flex items-center justify-between px-0.5 text-[10px]">
              <span
                className={cn(
                  'font-semibold tracking-wider uppercase',
                  isError ? 'text-destructive' : 'text-primary animate-pulse'
                )}
              >
                {isError ? 'Error' : latestLog?.metadata?.step || 'Initializing...'}
              </span>
              <span className="text-muted-foreground font-mono">
                {isError ? '!' : `${latestLog?.metadata?.progress || 0}%`}
              </span>
            </div>
            <Progress
              className={cn('h-1.5', isError ? 'bg-destructive/20' : 'bg-secondary/50')}
              indicatorClassName={isError ? 'bg-destructive' : ''}
              value={isError ? 100 : latestLog?.metadata?.progress || 0}
            />
            {isError && (
              <p className="text-destructive line-clamp-2 text-[10px] leading-tight font-medium">
                {latestLog?.metadata?.error || 'An unexpected error occurred.'}
              </p>
            )}
          </div>
        ) : (
          <div className="flex w-full gap-2">
            <Button
              aria-label="Edit playlist settings"
              className="group/btn text-muted-foreground hover:text-secondary hover:bg-secondary/10 hover:border-secondary/30 hover:shadow-secondary/10 h-10 min-h-[44px] w-10 min-w-[44px] border-white/10 bg-white/5 transition-all hover:scale-105 hover:shadow-lg active:scale-95"
              onClick={onEdit}
              size="icon"
              variant="outline"
            >
              <Edit2 className="h-4 w-4 transition-transform group-hover/btn:-rotate-12" />
            </Button>

            <Button
              aria-label="Delete playlist"
              className="group/del text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-destructive/10 h-10 min-h-[44px] w-10 min-w-[44px] border-white/10 bg-white/5 transition-all hover:scale-105 hover:shadow-lg active:scale-95"
              onClick={onDelete}
              size="icon"
              variant="outline"
            >
              <Trash2 className="h-4 w-4 transition-transform group-hover/del:scale-110" />
            </Button>

            <RunButton
              className="h-10 min-h-[44px] flex-1"
              disabled={!config.enabled}
              onRunComplete={onRunComplete}
              onRunStart={onRunStart}
              playlistId={config.id}
              playlistName={config.name}
            />

            <Button
              aria-label="View curation history"
              className={cn(
                'text-muted-foreground h-10 min-h-[44px] w-10 min-w-[44px] border-white/10 bg-white/5 transition-all',
                !latestLog?.metadata?.diff
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-primary/10 hover:scale-105 hover:shadow-lg'
              )}
              disabled={!latestLog?.metadata?.diff}
              onClick={onShowHistory}
              size="icon"
              variant="outline"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </CardFooter>
  );
};
