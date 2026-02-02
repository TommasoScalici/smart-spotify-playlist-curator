import { CurationEstimate } from '@smart-spotify-curator/shared';
import { AlertTriangle, ArrowRight, Info, Loader2, Music2, Play, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import { ChangeRow } from './curation-modal/ChangeRow';

interface ConfirmCurationModalProps {
  estimate: CurationEstimate | null;
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (planId?: string) => void;
  playlistName?: string;
}

export const ConfirmCurationModal = ({
  estimate,
  isLoading = false,
  isOpen,
  onClose,
  onConfirm,
  playlistName = 'Playlist'
}: ConfirmCurationModalProps) => {
  // Helper to calculate total changes for visual impact
  const totalChanges = estimate
    ? estimate.duplicatesToRemove +
      estimate.agedOutTracks +
      estimate.artistLimitRemoved +
      estimate.sizeLimitRemoved +
      estimate.mandatoryToAdd +
      estimate.aiTracksToAdd
    : 0;

  // Derived lists for accordion details
  const duplicates = estimate?.removed?.filter((t) => t.reason === 'duplicate');
  const agedOut = estimate?.removed?.filter((t) => t.reason === 'expired');
  const artistLimit = estimate?.removed?.filter((t) => t.reason === 'artist_limit');
  const sizeLimit = estimate?.removed?.filter((t) => t.reason === 'size_limit');

  const vipTracks = estimate?.added?.filter((t) => t.source === 'mandatory');
  const aiTracks = estimate?.added?.filter((t) => t.source === 'ai');

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 border-white/10 bg-black/80 text-white shadow-2xl backdrop-blur-xl duration-300 sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-3 text-2xl font-light tracking-wide">
            <div className="bg-primary/20 text-primary flex h-10 w-10 items-center justify-center rounded-full shadow-[0_0_15px_rgba(29,185,84,0.3)]">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span>Pre-Flight Check</span>
              <span className="text-muted-foreground/60 text-xs font-normal tracking-wider uppercase">
                Automated Curation
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Review the projected changes for{' '}
            <span className="font-semibold text-white">"{playlistName}"</span>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex animate-pulse flex-col items-center justify-center gap-4 py-12">
            <div className="relative">
              <div className="bg-primary/20 absolute inset-0 animate-ping rounded-full opacity-75"></div>
              <Loader2 className="text-primary relative h-12 w-12 animate-spin" />
            </div>
            <p className="text-muted-foreground text-sm font-medium tracking-wide">
              analyzing playlist vibe...
            </p>
          </div>
        ) : estimate ? (
          <div className="animate-in slide-in-from-bottom-5 fill-mode-forwards space-y-6 py-4 delay-150 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Before Card */}
              <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                <span className="text-muted-foreground text-xs font-medium uppercase">
                  Current State
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{estimate.currentTracks}</span>
                  <span className="text-muted-foreground text-sm">tracks</span>
                </div>
              </div>

              {/* After Card */}
              <div className="border-primary/20 bg-primary/5 hover:bg-primary/10 group relative flex flex-col gap-1 overflow-hidden rounded-xl border p-4 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-10 transition-opacity group-hover:opacity-20">
                  <Music2 className="h-12 w-12 -rotate-12" />
                </div>
                <span className="text-primary/80 text-xs font-medium uppercase">
                  Predicted Final
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-primary text-3xl font-bold">{estimate.predictedFinal}</span>
                  <span className="text-primary/80 text-sm">tracks</span>
                </div>
              </div>
            </div>

            {/* Visual Flow of Changes */}
            <div className="space-y-3 rounded-xl border border-white/5 bg-black/40 p-5">
              <h4 className="text-muted-foreground mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                <span className="h-px flex-1 bg-white/10"></span>
                Transformation Log
                <span className="h-px flex-1 bg-white/10"></span>
              </h4>

              <div className="space-y-3">
                <ChangeRow
                  bg="bg-blue-400/10"
                  color="text-blue-400"
                  count={estimate.duplicatesToRemove}
                  icon={<X className="h-3 w-3" />}
                  label="Duplicates"
                  tracks={duplicates}
                  type="remove"
                />
                <ChangeRow
                  bg="bg-amber-400/10"
                  color="text-amber-400"
                  count={estimate.agedOutTracks}
                  icon={<X className="h-3 w-3" />}
                  label="Aged Out"
                  tracks={agedOut}
                  type="remove"
                />
                <ChangeRow
                  bg="bg-purple-400/10"
                  color="text-purple-400"
                  count={estimate.artistLimitRemoved}
                  icon={<X className="h-3 w-3" />}
                  label="Artist limit"
                  tracks={artistLimit}
                  type="remove"
                />
                <ChangeRow
                  bg="bg-rose-400/10"
                  color="text-rose-400"
                  count={estimate.sizeLimitRemoved}
                  icon={<X className="h-3 w-3" />}
                  label="Size limit"
                  tracks={sizeLimit}
                  type="remove"
                />
                <ChangeRow
                  bg="bg-emerald-400/10"
                  color="text-emerald-400"
                  count={estimate.mandatoryToAdd}
                  icon={<ArrowRight className="h-3 w-3" />}
                  label="VIP Tracks"
                  tracks={vipTracks}
                  type="add"
                />
                <ChangeRow
                  bg="bg-purple-400/10"
                  color="text-purple-400"
                  count={estimate.aiTracksToAdd}
                  icon={<Music2 className="h-3 w-3" />}
                  label="AI Suggestions"
                  tracks={aiTracks}
                  type="add"
                />
              </div>

              {totalChanges === 0 && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-yellow-500/80 italic">
                  <AlertTriangle className="h-4 w-4" />
                  No changes detected based on current rules.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground animate-in fade-in py-10 text-center">
            Unable to load estimate. Please try again.
          </div>
        )}

        <DialogFooter className="gap-3 pt-2 sm:gap-0">
          <Button
            className="hover:bg-white/5 hover:text-white"
            disabled={isLoading}
            onClick={onClose}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(29,185,84,0.3)] transition-all hover:scale-105 active:scale-95"
            disabled={isLoading || !estimate}
            onClick={() => onConfirm(estimate?.planId)}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4 fill-current" />
            )}
            Run Automation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
