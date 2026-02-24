import { BaseTrack } from '@smart-spotify-curator/shared';
import { ChevronDown, ChevronRight, PlayCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChangeRowProps {
  bg: string;
  color: string;
  count: number;
  icon: React.ReactNode;
  label: string;
  tracks?: BaseTrack[];
  type: 'add' | 'remove';
}

export const ChangeRow = ({ bg, color, count, icon, label, tracks, type }: ChangeRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewTrackUri, setPreviewTrackUri] = useState<null | string>(null);
  const hasTracks = tracks && tracks.length > 0;

  if (count <= 0) return null;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'group flex items-center justify-between py-2 transition-colors',
          hasTracks ? 'hover:bg-muted -mx-2 cursor-pointer rounded-md px-2' : 'py-2'
        )}
        onClick={() => hasTracks && setIsOpen(!isOpen)}
      >
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
          <span className="text-foreground text-sm font-medium">{label}</span>
          {hasTracks && (
            <div className="text-muted-foreground group-hover:text-foreground ml-1 transition-colors">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasTracks && (
            <div className="bg-border/50 group-hover:bg-border mx-2 h-px w-12 transition-colors"></div>
          )}
          <Badge className={cn('border-0 font-mono text-xs', bg, color)} variant="outline">
            {type === 'remove' ? '-' : '+'}
            {count}
          </Badge>
        </div>
      </div>

      {/* Expanded Track List */}
      {isOpen && hasTracks && (
        <div className="animate-in slide-in-from-top-2 fade-in pr-2 pb-2 pl-9 duration-200">
          <div className="border-border/50 bg-background/40 max-h-[160px] overflow-y-auto rounded-md border p-2">
            <ul className="space-y-1">
              {tracks.map((track, index) => (
                <li
                  className="border-border/50 flex flex-col gap-2 border-b pb-1 last:border-0 last:pb-0"
                  key={`${track.uri}-${index}`}
                >
                  <div className="group flex items-center justify-between gap-2 text-xs">
                    <div className="flex flex-1 flex-col truncate">
                      <span className="text-foreground/90 truncate font-medium">{track.name}</span>
                      <span className="text-muted-foreground truncate">{track.artist}</span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground p-1 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTrackUri(previewTrackUri === track.uri ? null : track.uri);
                      }}
                      title="Preview Track"
                      type="button"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </button>
                  </div>
                  {previewTrackUri === track.uri && (
                    <div className="animate-in fade-in slide-in-from-top-1 mt-1 duration-200">
                      <iframe
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        className="bg-background/50 rounded-md"
                        height="80"
                        src={`https://open.spotify.com/embed/track/${track.uri.split(':').pop()}?theme=0`}
                        title={`Spotify player - ${track.name}`}
                        width="100%"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
