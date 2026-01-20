import { CurationDiff } from '@smart-spotify-curator/shared';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, MinusCircle, Music } from 'lucide-react';

interface DiffViewerProps {
  diff: CurationDiff;
  isDryRun?: boolean;
}

export const DiffViewer = ({ diff, isDryRun }: DiffViewerProps) => {
  const hasAdded = diff.added.length > 0;
  const hasRemoved = diff.removed.length > 0;

  if (!hasAdded && !hasRemoved) {
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
    <div className="flex flex-col gap-4 h-full">
      {isDryRun && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium">
          <span className="text-lg">🧪</span>
          Test Run: These changes were NOT applied to Spotify.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[300px]">
        {/* Added Tracks Column */}
        <div className="flex flex-col rounded-lg border bg-card/50">
          <div className="p-3 border-b bg-green-500/10 flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-green-500" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              Added ({diff.added.length})
            </span>
          </div>
          <ScrollArea className="flex-1 h-[250px]">
            <div className="p-2 space-y-1">
              {diff.added.map((track) => (
                <div
                  key={track.uri}
                  className="flex flex-col p-2 text-sm rounded hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium truncate">{track.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{track.artist}</span>
                </div>
              ))}
              {diff.added.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  No tracks added.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Removed Tracks Column */}
        <div className="flex flex-col rounded-lg border bg-card/50">
          <div className="p-3 border-b bg-red-500/10 flex items-center gap-2">
            <MinusCircle className="h-4 w-4 text-red-500" />
            <span className="font-semibold text-red-600 dark:text-red-400">
              Removed ({diff.removed.length})
            </span>
          </div>
          <ScrollArea className="flex-1 h-[250px]">
            <div className="p-2 space-y-1">
              {diff.removed.map((track) => (
                <div
                  key={track.uri}
                  className="flex flex-col p-2 text-sm rounded hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium truncate decoration-line-through decoration-red-500/50">
                    {track.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{track.artist}</span>
                </div>
              ))}
              {diff.removed.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  No tracks removed.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
