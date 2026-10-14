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
            className="shrink-0"
            size="xs"
            variant={
              reason === 'duplicate'
                ? 'info'
                : reason === 'expired'
                  ? 'warning'
                  : reason === 'artist_limit'
                    ? 'purple'
                    : reason === 'size_limit'
                      ? 'pink'
                      : 'outline'
            }
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
