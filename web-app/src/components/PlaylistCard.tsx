import { useNavigate } from 'react-router-dom';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Edit2, Music, Activity, Users, Radio } from 'lucide-react';
import { RunButton } from './RunButton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface PlaylistCardProps {
  config: PlaylistConfig & { _docId: string };
}

// Deterministic gradient generator based on string ID
const getMoodGradient = (id: string, enabled: boolean) => {
  if (!enabled) return 'from-gray-500/10 to-gray-900/10';

  const gradients = [
    'from-violet-600/20 via-purple-900/20 to-blue-900/20', // Deep Space
    'from-emerald-500/20 via-green-900/20 to-teal-900/20', // Toxic/Cyber
    'from-rose-500/20 via-red-900/20 to-orange-900/20', // Heat
    'from-blue-500/20 via-cyan-900/20 to-slate-900/20', // Ice
    'from-amber-500/20 via-orange-900/20 to-yellow-900/20' // Solar
  ];

  const charCode = id.charCodeAt(0) + id.length;
  return gradients[charCode % gradients.length];
};

export const PlaylistCard = ({ config }: PlaylistCardProps) => {
  const navigate = useNavigate();

  // Mock Metrics (Stable per render)
  // Deterministic Mock Metrics based on Config ID
  const stats = useMemo(() => {
    // Simple hash to get stable numbers per playlist
    const hash = config.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    return {
      followers: Math.floor(pseudoRandom(hash) * 800) + 120,
      tracks: config.settings.targetTotalTracks || Math.floor(pseudoRandom(hash + 1) * 50) + 20,
      health: Math.floor(pseudoRandom(hash + 2) * 20) + 80 // 80-99%
    };
  }, [config.id, config.settings.targetTotalTracks]);

  const gradientClass = useMemo(
    () => getMoodGradient(config.id, config.enabled),
    [config.id, config.enabled]
  );

  return (
    <Card
      className={cn(
        'group relative overflow-hidden flex flex-col h-full min-h-[260px] border-0 transition-all duration-500',
        'hover:shadow-2xl hover:-translate-y-1',
        // Glassmorphism Base
        'bg-card/40 backdrop-blur-xl',
        // Border Gradient Trick
        'before:absolute before:inset-0 before:p-[1px] before:-z-10 before:rounded-xl before:bg-gradient-to-b before:from-white/10 before:to-white/5',
        !config.enabled && 'opacity-60 grayscale-[0.8] hover:grayscale-0'
      )}
    >
      {/* Dynamic Background Mesh */}
      <div
        className={cn(
          'absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-60 bg-gradient-to-br',
          gradientClass
        )}
      />

      {/* Header Area */}
      <div className="relative p-5 flex gap-4 items-start z-10">
        {/* Album Art with Glow */}
        <div className="relative shrink-0">
          <div className="h-20 w-20 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-500">
            {config.imageUrl ? (
              <img src={config.imageUrl} alt={config.name} className="w-full h-full object-cover" />
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
            {config.owner || 'Smart Curator'}
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
      </div>

      {/* Metrics Grid (Mock) */}
      <CardContent className="relative z-10 p-5 pt-0">
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 bg-black/5 rounded-lg">
          <div className="flex flex-col items-center justify-center text-center p-1">
            <span className="text-xs text-muted-foreground font-medium mb-1">Followers</span>
            <div className="flex items-center gap-1 text-sm font-bold text-foreground">
              <Users className="h-3 w-3 text-sky-400" />
              {stats.followers}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-1 border-x border-white/5">
            <span className="text-xs text-muted-foreground font-medium mb-1">Health</span>
            <div className="flex items-center gap-1 text-sm font-bold text-green-400">
              <Activity className="h-3 w-3" />
              {stats.health}%
            </div>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-1">
            <span className="text-xs text-muted-foreground font-medium mb-1">Tracks</span>
            <div className="flex items-center gap-1 text-sm font-bold text-foreground">
              <Music className="h-3 w-3 text-purple-400" />
              {stats.tracks}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="relative z-10 p-5 pt-2 mt-auto flex gap-3">
        <Button
          variant="ghost"
          size="default"
          className="flex-1 gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 h-10 min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/playlist/${config._docId}`);
          }}
        >
          <Edit2 className="h-4 w-4" />
          Config
        </Button>

        <div className="flex-1">
          <RunButton
            playlistId={config.id}
            className="w-full bg-gradient-to-r from-primary/90 to-primary hovered:from-primary hovered:to-primary/90 shadow-lg shadow-primary/20 border-0 h-10 min-h-[44px]"
          />
        </div>
      </CardFooter>
    </Card>
  );
};
