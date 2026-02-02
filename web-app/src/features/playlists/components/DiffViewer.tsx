import { CurationDiff } from '@smart-spotify-curator/shared';
import { CheckCircle2, History, MinusCircle, Music, PlusCircle } from 'lucide-react';

import { DiffColumn } from './diff-viewer/DiffColumn';
import { TrackItem } from './diff-viewer/TrackItem';

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
      <div className="text-muted-foreground flex w-full flex-col items-center justify-center gap-4 p-8">
        {isDryRun && (
          <div className="flex w-full items-center justify-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-600 dark:text-amber-400">
            <span className="text-lg">🧪</span>
            Test Run: No changes were applied to Spotify.
          </div>
        )}
        <div className="flex flex-col items-center">
          <Music className="mb-2 h-8 w-8 opacity-50" />
          <p>No changes were made in the last run.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {isDryRun && (
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-600 dark:text-amber-400">
          <span className="text-lg">🧪</span>
          Test Run: These changes were NOT applied to Spotify.
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:grid-cols-3 md:overflow-hidden">
        {/* Added Tracks Column */}
        <DiffColumn
          bgClass="bg-green-500/10"
          colorClass="text-green-500"
          count={diff.added.length}
          emptyIcon={PlusCircle}
          emptyMessage="No tracks added."
          icon={PlusCircle}
          title="Added"
        >
          {diff.added.map((track) => (
            <TrackItem key={track.uri} track={track} />
          ))}
        </DiffColumn>

        {/* Removed Tracks Column */}
        <DiffColumn
          bgClass="bg-red-500/10"
          colorClass="text-red-500"
          count={diff.removed.length}
          emptyIcon={MinusCircle}
          emptyMessage="No tracks removed."
          icon={MinusCircle}
          title="Removed"
        >
          {diff.removed.map((track) => (
            <TrackItem key={track.uri} track={track} variant="removed" />
          ))}
        </DiffColumn>

        {/* Kept Mandatory Column */}
        <DiffColumn
          bgClass="bg-sky-500/10"
          colorClass="text-sky-500"
          count={diff.keptMandatory?.length || 0}
          emptyIcon={History}
          emptyMessage="No required tracks to show."
          icon={CheckCircle2}
          title="Kept VIPs"
        >
          {diff.keptMandatory?.map((track) => (
            <TrackItem key={track.uri} track={track} />
          ))}
        </DiffColumn>
      </div>
    </div>
  );
};
