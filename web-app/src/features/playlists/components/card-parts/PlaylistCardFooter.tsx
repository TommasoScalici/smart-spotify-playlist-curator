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
    <CardFooter className="relative z-10 p-5 pt-2 mt-auto flex gap-3">
      <div className="flex-1 flex flex-col justify-center min-h-[44px]">
        {isRunning || isError ? (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between text-[10px] items-center px-0.5">
              <span
                className={cn(
                  'font-semibold uppercase tracking-wider',
                  isError ? 'text-destructive' : 'text-primary animate-pulse'
                )}
              >
                {isError ? 'Error' : latestLog?.metadata?.step || 'Initializing...'}
              </span>
              <span className="font-mono text-muted-foreground">
                {isError ? '!' : `${latestLog?.metadata?.progress || 0}%`}
              </span>
            </div>
            <Progress
              value={isError ? 100 : latestLog?.metadata?.progress || 0}
              className={cn('h-1.5', isError ? 'bg-destructive/20' : 'bg-secondary/50')}
              indicatorClassName={isError ? 'bg-destructive' : ''}
            />
            {isError && (
              <p className="text-[10px] text-destructive font-medium line-clamp-2 leading-tight">
                {latestLog?.metadata?.error || 'An unexpected error occurred.'}
              </p>
            )}
          </div>
        ) : (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="icon"
              aria-label="Edit playlist settings"
              className="group/btn border-white/10 bg-white/5 text-muted-foreground hover:text-secondary hover:bg-secondary/10 hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/10 hover:scale-105 active:scale-95 transition-all h-10 w-10 min-h-[44px] min-w-[44px]"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4 transition-transform group-hover/btn:-rotate-12" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Delete playlist"
              className="group/del border-white/10 bg-white/5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-lg hover:shadow-destructive/10 hover:scale-105 active:scale-95 transition-all h-10 w-10 min-h-[44px] min-w-[44px]"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 transition-transform group-hover/del:scale-110" />
            </Button>

            <RunButton
              playlistId={config.id}
              playlistName={config.name}
              className="flex-1 h-10 min-h-[44px]"
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
                    className="border-white/10 bg-white/5 text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30 transition-all h-10 w-10 min-h-[44px] min-w-[44px]"
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
                  'border-white/10 bg-white/5 text-muted-foreground transition-all h-10 w-10 min-h-[44px] min-w-[44px]',
                  latestLog.metadata.dryRun
                    ? 'hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30 text-amber-500/80'
                    : 'hover:text-primary hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10'
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
