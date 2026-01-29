import { Edit2, FlaskConical, History, Trash2 } from 'lucide-react';

import { ActivityLog, PlaylistConfig } from '@smart-spotify-curator/shared';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { RunButton } from '../RunButton';

interface PlaylistCardFooterProps {
  config: PlaylistConfig & { _docId: string };
  latestLog: ActivityLog | null;
  isOptimisticallyRunning: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRunStart: () => void;
  onRunComplete: () => void;
  onRunTest: () => void;
  onShowHistory: () => void;
}

export const PlaylistCardFooter = ({
  config,
  latestLog,
  isOptimisticallyRunning,
  onEdit,
  onDelete,
  onRunStart,
  onRunComplete,
  onRunTest,
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
              value={isError ? 100 : latestLog?.metadata?.progress || 0}
              className={cn('h-1.5', isError ? 'bg-destructive/20' : 'bg-secondary/50')}
              indicatorClassName={isError ? 'bg-destructive' : ''}
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
              variant="outline"
              size="icon"
              aria-label="Edit playlist settings"
              className="group/btn text-muted-foreground hover:text-secondary hover:bg-secondary/10 hover:border-secondary/30 hover:shadow-secondary/10 h-10 min-h-[44px] w-10 min-w-[44px] border-white/10 bg-white/5 transition-all hover:scale-105 hover:shadow-lg active:scale-95"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4 transition-transform group-hover/btn:-rotate-12" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Delete playlist"
              className="group/del text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-destructive/10 h-10 min-h-[44px] w-10 min-w-[44px] border-white/10 bg-white/5 transition-all hover:scale-105 hover:shadow-lg active:scale-95"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 transition-transform group-hover/del:scale-110" />
            </Button>

            <RunButton
              playlistId={config.id}
              playlistName={config.name}
              className="h-10 min-h-[44px] flex-1"
              disabled={!config.enabled}
              onRunStart={onRunStart}
              onRunComplete={onRunComplete}
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Start test run"
                    className="text-muted-foreground h-10 min-h-[44px] w-10 min-w-[44px] border-white/10 bg-white/5 transition-all hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-400"
                    onClick={onRunTest}
                  >
                    <FlaskConical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Test Run (Dry Run) - See changes without saving</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {latestLog?.metadata?.diff && (
              <Button
                variant="outline"
                size="icon"
                aria-label="View curation history"
                className={cn(
                  'text-muted-foreground h-10 min-h-[44px] w-10 min-w-[44px] border-white/10 bg-white/5 transition-all',
                  latestLog.metadata.dryRun
                    ? 'text-amber-500/80 hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-400'
                    : 'hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-primary/10 hover:shadow-lg'
                )}
                onClick={onShowHistory}
              >
                <History className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </CardFooter>
  );
};
