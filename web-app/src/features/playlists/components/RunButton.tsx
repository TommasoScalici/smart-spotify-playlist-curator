import { CurationEstimate } from '@smart-spotify-curator/shared';
import { Loader2, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmCurationModal } from '@/features/playlists/components/ConfirmCurationModal';
import { cn } from '@/lib/utils';
import { FunctionsService } from '@/services/functions-service';

interface RunButtonProps {
  className?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  onRunComplete?: () => void;
  onRunStart?: () => void;
  playlistId: string;
  playlistName: string;
}

/**
 * Button component to trigger the curation automation pipeline.
 * Handles the pre-flight check flow (Estimate -> Confirm -> Run).
 * @param playlistId - ID of the playlist to curate (required)
 * @param playlistName - Display name of the playlist (for modal)
 * @param iconOnly - Whether to render as an icon-only button
 * @param className - Additional CSS classes
 * @param disabled - Disabled state
 */
export const RunButton = ({
  className = '',
  disabled = false,
  iconOnly = false,
  onRunComplete,
  onRunStart,
  playlistId,
  playlistName
}: RunButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<CurationEstimate | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || disabled) return;

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

  const handleConfirm = async (planId?: string) => {
    setShowModal(false);
    setLoading(true);
    onRunStart?.();
    const promise = FunctionsService.triggerCuration(playlistId, { planId });
    toast.promise(promise, {
      error: (err: unknown) => `Failed: ${err instanceof Error ? err.message : String(err)}`,
      loading: 'Running automation...',
      success: 'Automation completed! Check your Spotify.'
    });

    try {
      await promise;
    } catch {
      // Error handled by toast
    } finally {
      setLoading(false);
      onRunComplete?.();
    }
  };

  const buttonContent = loading ? (
    <Loader2 className="text-primary animate-spin" size={iconOnly ? 20 : 18} />
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
                  aria-label="Run curation"
                  className={cn(
                    'border-primary/20 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 text-primary rounded-full shadow-sm transition-all duration-200 hover:scale-105',
                    disabled &&
                      'hover:bg-primary/10 hover:border-primary/20 cursor-not-allowed opacity-50 hover:scale-100',
                    className
                  )}
                  disabled={loading || disabled}
                  onClick={handleClick}
                  size="icon"
                  variant="outline"
                >
                  {buttonContent}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabled ? 'Enable playlist to run curation' : 'Run Now'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <ConfirmCurationModal
          estimate={estimate}
          isLoading={estimating}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
          playlistName={playlistName}
        />
      </>
    );
  }

  return (
    <>
      <Button
        className={cn('gap-2', className)}
        disabled={loading || disabled}
        onClick={handleClick}
      >
        {buttonContent}
        <span>Run Curation</span>
      </Button>

      <ConfirmCurationModal
        estimate={estimate}
        isLoading={estimating}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        playlistName={playlistName}
      />
    </>
  );
};
