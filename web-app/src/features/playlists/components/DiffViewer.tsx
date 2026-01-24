import { CurationDiff } from '@smart-spotify-curator/shared';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, MinusCircle, Music, CheckCircle2, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  diff: CurationDiff;
  isDryRun?: boolean;
}

export const DiffViewer = ({ diff, isDryRun }: DiffViewerProps) => {
  const hasAdded = diff.added.length > 0;
  const hasRemoved = diff.removed.length > 0;
  const hasKept = (diff.keptMandatory?.length || 0) > 0;

  if (!hasAdded && !hasRemoved && !hasKept) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center p-8 text-muted-foreground w-full">
        {isDryRun && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium w-full justify-center">
            <span className="text-lg">🧪</span>
            Test Run: No changes were applied to Spotify.
          </div>
        )}
        <div className="flex flex-col items-center">
          <Music className="h-8 w-8 mb-2 opacity-50" />
          <p>No changes were made in the last run.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {isDryRun && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium shrink-0">
          <span className="text-lg">🧪</span>
          Test Run: These changes were NOT applied to Spotify.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 md:overflow-hidden">
        {/* Added Tracks Column */}
        <div className="flex flex-col rounded-lg border bg-card/30 backdrop-blur-md overflow-hidden border-white/5 h-72 md:h-full shrink-0 md:shrink">
          <div className="p-3 border-b bg-green-500/10 flex items-center gap-2 shrink-0">
            <PlusCircle className="h-4 w-4 text-green-500" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              Added ({diff.added.length})
            </span>
          </div>
          <div className="flex-1 relative min-h-0">
            <ScrollArea className="h-full w-full" type="always">
              <div className="p-3 space-y-2">
                {diff.added.map((track) => (
                  <div
                    key={track.uri}
                    className="flex flex-col p-2.5 text-sm rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <span className="font-semibold break-words">{track.name}</span>
                    <span className="text-xs text-muted-foreground break-words">
                      {track.artist}
                    </span>
                  </div>
                ))}
                {diff.added.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 text-center opacity-40">
                    <PlusCircle className="h-6 w-6 mb-2" />
                    <p className="text-xs italic">No tracks added.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Removed Tracks Column */}
        <div className="flex flex-col rounded-lg border bg-card/30 backdrop-blur-md overflow-hidden border-white/5 h-72 md:h-full shrink-0 md:shrink">
          <div className="p-3 border-b bg-red-500/10 flex items-center gap-2 shrink-0">
            <MinusCircle className="h-4 w-4 text-red-500" />
            <span className="font-semibold text-red-600 dark:text-red-400">
              Removed ({diff.removed.length})
            </span>
          </div>
          <div className="flex-1 relative min-h-0">
            <ScrollArea className="h-full w-full" type="always">
              <div className="p-3 space-y-2">
                {diff.removed.map((track) => (
                  <div
                    key={track.uri}
                    className="flex flex-col p-2.5 text-sm rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-all group/item scroll-m-2"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-semibold break-words decoration-line-through decoration-red-500/50 flex-1 leading-tight">
                        {track.name}
                      </span>
                      {track.reason && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 shrink-0 uppercase',
                            track.reason === 'duplicate' &&
                              'bg-blue-500/10 text-blue-500 border-blue-500/20',
                            track.reason === 'expired' &&
                              'bg-amber-500/10 text-amber-500 border-amber-500/20',
                            track.reason === 'other' &&
                              'bg-muted text-muted-foreground border-muted-foreground/20'
                          )}
                        >
                          {track.reason}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground break-words leading-tight">
                      {track.artist}
                    </span>
                  </div>
                ))}
                {diff.removed.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 text-center opacity-40">
                    <MinusCircle className="h-6 w-6 mb-2" />
                    <p className="text-xs italic">No tracks removed.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Kept Mandatory Column */}
        <div className="flex flex-col rounded-lg border bg-card/30 backdrop-blur-md overflow-hidden border-white/5 h-72 md:h-full shrink-0 md:shrink">
          <div className="p-3 border-b bg-sky-500/10 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-sky-500" />
            <span className="font-bold text-sky-600 dark:text-sky-400">
              Kept VIPs ({diff.keptMandatory?.length || 0})
            </span>
          </div>
          <div className="flex-1 relative min-h-0">
            <ScrollArea className="h-full w-full" type="always">
              <div className="p-3 space-y-2">
                {diff.keptMandatory?.map((track) => (
                  <div
                    key={track.uri}
                    className="flex flex-col p-2.5 text-sm rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <span className="font-semibold break-words">{track.name}</span>
                    <span className="text-xs text-muted-foreground break-words">
                      {track.artist}
                    </span>
                  </div>
                ))}
                {(!diff.keptMandatory || diff.keptMandatory.length === 0) && (
                  <div className="flex flex-col items-center justify-center p-8 text-center opacity-40">
                    <History className="h-6 w-6 mb-2" />
                    <p className="text-xs italic">No required tracks to show.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};
