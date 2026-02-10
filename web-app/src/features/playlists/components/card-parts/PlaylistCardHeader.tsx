import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Music, Radio } from 'lucide-react';
import { useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlaylistCardHeaderProps {
  config: PlaylistConfig;
  imageUrl?: null | string;
  isToggling: boolean;
  onToggle: (enabled: boolean) => void;
  owner?: string;
}

export const PlaylistCardHeader = ({
  config,
  imageUrl,
  isToggling,
  onToggle,
  owner
}: PlaylistCardHeaderProps) => {
  const [imgError, setImgError] = useState(false);

  // Prioritize fresh imageUrl from metrics over potentially stale config.imageUrl
  const coverUrl = imageUrl || config.imageUrl;

  // Track the last URL we saw to know when to reset the error state (Recommended React Pattern > useEffect)
  const [lastCoverUrl, setLastCoverUrl] = useState(coverUrl);

  if (coverUrl !== lastCoverUrl) {
    setLastCoverUrl(coverUrl);
    setImgError(false);
  }
  const showImage = coverUrl && !imgError;

  return (
    <div className="relative z-10 flex items-start gap-4 p-5">
      {/* Album Art with Glow */}
      <div className="relative shrink-0">
        <div className="h-20 w-20 overflow-hidden rounded-lg border border-white/10 shadow-lg transition-transform duration-500 group-hover:scale-105">
          {showImage ? (
            <img
              alt={config.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
              src={coverUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/40">
              <Music className="h-8 w-8 text-white/50" />
            </div>
          )}
        </div>
        {/* Pulsing Status Dot */}
        {config.enabled && (
          <span className="absolute -right-1 -bottom-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="border-background relative inline-flex h-4 w-4 rounded-full border-2 bg-green-500"></span>
          </span>
        )}
      </div>

      {/* Text Info */}
      <div className="min-w-0 flex-1 pt-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="text-foreground group-hover:text-primary line-clamp-1 cursor-help text-xl leading-tight font-bold tracking-tight drop-shadow-sm transition-colors md:line-clamp-2">
                {config.name}
              </h3>
            </TooltipTrigger>
            <TooltipContent>
              <p>{config.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
          <Radio className="h-3 w-3" />
          {owner || 'Smart Curator'}
        </p>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-muted-foreground/80 hover:text-foreground mt-2 line-clamp-2 cursor-help text-sm transition-colors md:line-clamp-3">
                {config.settings.description || 'Automation rules active'}
              </p>
            </TooltipTrigger>
            <TooltipContent align="start" side="bottom">
              <p className="max-w-xs">
                {config.settings.description || 'No description provided.'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Enable/Disable Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {isToggling && (
                <div className="border-primary h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
              )}
              <Switch
                checked={config.enabled}
                className="data-[state=checked]:bg-green-500"
                disabled={isToggling}
                onCheckedChange={onToggle}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.enabled ? 'Disable automation' : 'Enable automation'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
