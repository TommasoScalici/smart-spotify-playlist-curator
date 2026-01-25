import { useState } from 'react';
import { toast } from 'sonner';
import { Zap, Loader2 } from 'lucide-react';
import { FunctionsService } from '@/services/functions-service';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ConfirmCurationModal } from '@/features/playlists/components/ConfirmCurationModal';
import { CurationEstimate } from '@smart-spotify-curator/shared';

interface RunButtonProps {
  playlistId?: string;
  playlistName?: string;
  iconOnly?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Button component to trigger the curation automation pipeline.
 * Handles the pre-flight check flow (Estimate -> Confirm -> Run).
 * @param playlistId - ID of the playlist to curate
 * @param playlistName - Display name of the playlist (for modal)
 * @param iconOnly - Whether to render as an icon-only button
 * @param className - Additional CSS classes
 * @param disabled - Disabled state
 */
export const RunButton = ({
  playlistId,
  playlistName = 'Playlist',
  iconOnly = false,
  className = '',
  disabled = false
}: RunButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<CurationEstimate | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || disabled) return;

    // If no playlistId, this is a "run all" action - show simple toast
    if (!playlistId) {
      toast.info('Running all playlists is not yet supported with the new pre-flight check.');
      return;
    }

    // Show modal and start fetching estimate
    setShowModal(true);
    setEstimating(true);
    setEstimate(null);

    try {
      const result = await FunctionsService.estimateCuration(playlistId);
      setEstimate(result);
    } catch (err) {
      toast.error('Failed to estimate curation', {
        description: err instanceof Error ? err.message : 'Unknown error'
      });
      setShowModal(false);
    } finally {
      setEstimating(false);
    }
  };

  const handleConfirm = async () => {
    setShowModal(false);
    setLoading(true);
    toast.promise(FunctionsService.triggerCuration(playlistId), {
      loading: 'Running automation...',
      success: 'Automation completed! Check your Spotify.',
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
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleClick}
                  disabled={loading || disabled}
                  aria-label="Run curation"
                  className={cn(
                    'rounded-full border-primary/20 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 text-primary hover:scale-105 transition-all duration-200 shadow-sm',
                    disabled &&
                      'opacity-50 cursor-not-allowed hover:bg-primary/10 hover:border-primary/20 hover:scale-100',
                    className
                  )}
                >
                  {buttonContent}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {disabled
                  ? 'Enable playlist to run curation'
                  : playlistId
                    ? 'Run Now'
                    : 'Run All Playlists'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <ConfirmCurationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
          estimate={estimate}
          isLoading={estimating}
          playlistName={playlistName}
        />
      </>
    );
  }

  // Fallback for non-icon version
  return (
    <>
      <Button
        onClick={handleClick}
        disabled={loading || disabled}
        className={cn('gap-2', className)}
      >
        {buttonContent}
        <span>Run Curation</span>
      </Button>

      <ConfirmCurationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        estimate={estimate}
        isLoading={estimating}
        playlistName={playlistName}
      />
    </>
  );
};
