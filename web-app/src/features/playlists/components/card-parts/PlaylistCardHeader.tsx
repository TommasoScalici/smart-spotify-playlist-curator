import { Music, Radio } from 'lucide-react';

import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlaylistCardHeaderProps {
  config: PlaylistConfig;
  imageUrl?: string | null;
  owner?: string;
  isToggling: boolean;
  onToggle: (enabled: boolean) => void;
}

export const PlaylistCardHeader = ({
  config,
  imageUrl,
  owner,
  isToggling,
  onToggle
}: PlaylistCardHeaderProps) => {
  return (
    <div className="relative p-5 flex gap-4 items-start z-10">
      {/* Album Art with Glow */}
      <div className="relative shrink-0">
        <div className="h-20 w-20 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-500">
          {config.imageUrl || imageUrl ? (
            <img
              src={config.imageUrl || imageUrl || ''}
              alt={config.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-black/40 flex items-center justify-center">
              <Music className="h-8 w-8 text-white/50" />
            </div>
          )}
        </div>
        {/* Pulsing Status Dot */}
        {config.enabled && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background"></span>
          </span>
        )}
      </div>

      {/* Text Info */}
      <div className="flex-1 min-w-0 pt-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="text-xl font-bold tracking-tight text-foreground leading-tight line-clamp-1 md:line-clamp-2 drop-shadow-sm group-hover:text-primary transition-colors cursor-help">
                {config.name}
              </h3>
            </TooltipTrigger>
            <TooltipContent>
              <p>{config.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider flex items-center gap-1.5">
          <Radio className="h-3 w-3" />
          {owner || 'Smart Curator'}
        </p>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm text-muted-foreground/80 mt-2 line-clamp-2 md:line-clamp-3 cursor-help hover:text-foreground transition-colors">
                {config.settings.description || 'Automation rules active'}
              </p>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start">
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
                <div className="animate-spin h-3 w-3 rounded-full border-2 border-primary border-t-transparent" />
              )}
              <Switch
                checked={config.enabled}
                onCheckedChange={onToggle}
                disabled={isToggling}
                className="data-[state=checked]:bg-green-500"
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
