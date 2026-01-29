import { AlertTriangle, ArrowRight, Info, Loader2, Music2, Play, X } from 'lucide-react';

import { CurationEstimate } from '@smart-spotify-curator/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ConfirmCurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimate: CurationEstimate | null;
  isLoading?: boolean;
  playlistName?: string;
}

export const ConfirmCurationModal = ({
  isOpen,
  onClose,
  onConfirm,
  estimate,
  isLoading = false,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border-white/10 bg-black/80 backdrop-blur-xl text-white shadow-2xl duration-300 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-3 text-2xl font-light tracking-wide">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary shadow-[0_0_15px_rgba(29,185,84,0.3)]">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span>Pre-Flight Check</span>
              <span className="text-xs font-normal text-muted-foreground/60 tracking-wider uppercase">
                Automated Curation
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Review the projected changes for{' '}
            <span className="font-semibold text-white">"{playlistName}"</span>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75"></div>
              <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground tracking-wide">
              analyzing playlist vibe...
            </p>
          </div>
        ) : estimate ? (
          <div className="space-y-6 py-4 animate-in slide-in-from-bottom-5 duration-500 delay-150 fill-mode-forwards">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Before Card */}
              <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Current State
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{estimate.currentTracks}</span>
                  <span className="text-sm text-muted-foreground">tracks</span>
                </div>
              </div>

              {/* After Card */}
              <div className="relative flex flex-col gap-1 rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors group overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Music2 className="h-12 w-12 -rotate-12" />
                </div>
                <span className="text-xs font-medium uppercase text-primary/80">
                  Predicted Final
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">{estimate.predictedFinal}</span>
                  <span className="text-sm text-primary/80">tracks</span>
                </div>
              </div>
            </div>

            {/* Visual Flow of Changes */}
            <div className="space-y-3 rounded-xl bg-black/40 p-5 border border-white/5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <span className="h-px flex-1 bg-white/10"></span>
                Transformation Log
                <span className="h-px flex-1 bg-white/10"></span>
              </h4>

              <div className="space-y-3">
                <ChangeRow
                  label="Duplicates"
                  count={estimate.duplicatesToRemove}
                  type="remove"
                  icon={<X className="h-3 w-3" />}
                  color="text-blue-400"
                  bg="bg-blue-400/10"
                />
                <ChangeRow
                  label="Aged Out"
                  count={estimate.agedOutTracks}
                  type="remove"
                  icon={<X className="h-3 w-3" />}
                  color="text-amber-400"
                  bg="bg-amber-400/10"
                />
                <ChangeRow
                  label="Artist limit"
                  count={estimate.artistLimitRemoved}
                  type="remove"
                  icon={<X className="h-3 w-3" />}
                  color="text-purple-400"
                  bg="bg-purple-400/10"
                />
                <ChangeRow
                  label="Size limit"
                  count={estimate.sizeLimitRemoved}
                  type="remove"
                  icon={<X className="h-3 w-3" />}
                  color="text-rose-400"
                  bg="bg-rose-400/10"
                />
                <ChangeRow
                  label="VIP Tracks"
                  count={estimate.mandatoryToAdd}
                  type="add"
                  icon={<ArrowRight className="h-3 w-3" />}
                  color="text-emerald-400"
                  bg="bg-emerald-400/10"
                />
                <ChangeRow
                  label="AI Suggestions"
                  count={estimate.aiTracksToAdd}
                  type="add"
                  icon={<Music2 className="h-3 w-3" />}
                  color="text-purple-400"
                  bg="bg-purple-400/10"
                />
              </div>

              {totalChanges === 0 && (
                <div className="flex items-center justify-center gap-2 py-2 text-yellow-500/80 text-sm italic">
                  <AlertTriangle className="h-4 w-4" />
                  No changes detected based on current rules.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground animate-in fade-in">
            Unable to load estimate. Please try again.
          </div>
        )}

        <DialogFooter className="gap-3 sm:gap-0 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-white/5 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || !estimate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(29,185,84,0.3)] transition-all hover:scale-105 active:scale-95"
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

// Sub-component for clean rows
const ChangeRow = ({
  label,
  count,
  type,
  icon,
  color,
  bg
}: {
  label: string;
  count: number;
  type: 'add' | 'remove';
  icon: React.ReactNode;
  color: string;
  bg: string;
}) => {
  if (count <= 0) return null;
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full transition-all group-hover:scale-110',
            bg,
            color
          )}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-white/80">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-px w-12 bg-white/5 mx-2 group-hover:bg-white/10 transition-colors"></div>
        <Badge variant="outline" className={cn('border-0 font-mono text-xs', bg, color)}>
          {type === 'remove' ? '-' : '+'}
          {count}
        </Badge>
      </div>
    </div>
  );
};
