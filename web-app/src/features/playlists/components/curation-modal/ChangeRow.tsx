import { BaseTrack } from '@smart-spotify-curator/shared';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const hasTracks = tracks && tracks.length > 0;

  if (count <= 0) return null;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'group flex items-center justify-between py-1 transition-colors',
          hasTracks ? '-mx-2 cursor-pointer rounded-md px-2 hover:bg-white/5' : ''
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
          <span className="text-sm font-medium text-white/80">{label}</span>
          {hasTracks && (
            <div className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-50">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasTracks && (
            <div className="mx-2 h-px w-12 bg-white/5 transition-colors group-hover:bg-white/10"></div>
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
          <ScrollArea className="h-auto max-h-[160px] rounded-md border border-white/5 bg-black/20 p-2">
            <ul className="space-y-1">
              {tracks.map((track) => (
                <li className="flex items-center justify-between gap-2 text-xs" key={track.uri}>
                  <div className="flex flex-1 flex-col truncate">
                    <span className="truncate font-medium text-white/90">{track.name}</span>
                    <span className="text-muted-foreground truncate">{track.artist}</span>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
