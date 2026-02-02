import { BaseTrack, TrackDiff } from '@smart-spotify-curator/shared';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TrackItemProps {
  track: BaseTrack | TrackDiff;
  variant?: 'default' | 'removed';
}

export const TrackItem = ({ track, variant = 'default' }: TrackItemProps) => {
  const isRemoved = variant === 'removed';
  const reason = isRemoved ? (track as TrackDiff).reason : null;

  return (
    <div className="group/item flex scroll-m-2 flex-col rounded-md border border-white/5 bg-white/5 p-2.5 text-sm transition-all hover:bg-white/10">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span
          className={cn(
            'flex-1 leading-tight font-semibold wrap-break-word',
            isRemoved && 'decoration-line-through decoration-red-500/50'
          )}
        >
          {track.name}
        </span>
        {reason && (
          <Badge
            className={cn(
              'shrink-0 px-1.5 py-0 text-[10px] uppercase',
              reason === 'duplicate' && 'border-blue-500/20 bg-blue-500/10 text-blue-500',
              reason === 'expired' && 'border-amber-500/20 bg-amber-500/10 text-amber-500',
              reason === 'artist_limit' && 'border-purple-500/20 bg-purple-500/10 text-purple-500',
              reason === 'size_limit' && 'border-rose-500/20 bg-rose-500/10 text-rose-500',
              (reason === 'other' || !reason) &&
                'bg-muted text-muted-foreground border-muted-foreground/20'
            )}
            variant="outline"
          >
            {reason === 'artist_limit'
              ? 'Artist limit'
              : reason === 'size_limit'
                ? 'Size limit'
                : reason || 'other'}
          </Badge>
        )}
      </div>
      <span className="text-muted-foreground text-xs leading-tight wrap-break-word">
        {track.artist}
      </span>
    </div>
  );
};
