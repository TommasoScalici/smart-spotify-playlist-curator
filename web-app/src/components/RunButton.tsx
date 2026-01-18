import { useState } from 'react';
import { toast } from 'sonner';
import { Zap, Loader2 } from 'lucide-react';
import { FunctionsService } from '../services/functions-service';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RunButtonProps {
  playlistId?: string;
  iconOnly?: boolean;
  className?: string;
}

export const RunButton = ({ playlistId, iconOnly = false, className = '' }: RunButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    const confirmMsg = playlistId
      ? 'Run curation for this playlist?'
      : 'Run curation for ALL active playlists?';

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    toast.promise(FunctionsService.triggerCuration(playlistId), {
      loading: 'Triggering curation...',
      success: 'Curation triggered successfully! Check your Spotify shortly.',
      error: (err: unknown) => `Failed: ${err instanceof Error ? err.message : String(err)}`,
      finally: () => setLoading(false)
    });
  };

  const buttonContent = loading ? (
    <Loader2 className="animate-spin text-primary" size={iconOnly ? 20 : 18} />
  ) : (
    <Zap className={cn('fill-current', iconOnly ? 'h-5 w-5' : 'h-4 w-4')} />
  );

  if (iconOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRun}
              disabled={loading}
              className={cn(
                'rounded-full border-primary/20 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 text-primary hover:scale-105 transition-all duration-200 shadow-sm',
                className
              )}
            >
              {buttonContent}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Run Curation</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      onClick={(e) => {
        handleRun(e); // Pass the event object
        e.stopPropagation();
      }}
      disabled={loading} // Use 'loading' state
      variant={playlistId ? 'default' : 'outline'}
      size={playlistId ? 'sm' : 'default'} // Override this in parent if needed via className
      className={cn(
        'gap-2 transition-all font-semibold relative overflow-hidden group border active:scale-95 hover:scale-105 backdrop-blur-sm',
        playlistId
          ? 'bg-tertiary text-tertiary-foreground border-transparent hover:bg-tertiary/90 shadow-lg shadow-tertiary/20'
          : 'bg-tertiary/10 text-tertiary border-tertiary/20 hover:bg-tertiary/20 hover:border-tertiary/40 shadow-[0_0_15px_rgba(var(--tertiary),0.15)] hover:shadow-[0_0_25px_rgba(var(--tertiary),0.3)]',
        className
      )}
    >
      {loading ? (
        <Loader2 className="animate-spin h-4 w-4" />
      ) : (
        <Zap className="h-4 w-4 transition-all group-hover:fill-current group-hover:scale-110 duration-300" />
      )}
      <span>{playlistId ? 'Run' : 'Run Active Rules'}</span>
    </Button>
  );
};
