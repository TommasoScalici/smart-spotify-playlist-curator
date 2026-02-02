import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { usePlaylistRealtime } from '../hooks/usePlaylistRealtime';
import { PlaylistCardDialogs } from './card-parts/PlaylistCardDialogs';
import { PlaylistCardFooter } from './card-parts/PlaylistCardFooter';
import { PlaylistCardHeader } from './card-parts/PlaylistCardHeader';
import { PlaylistCardMetrics } from './card-parts/PlaylistCardMetrics';

interface PlaylistCardProps {
  config: { _docId: string } & PlaylistConfig;
}

/**
 * Generates a deterministic gradient class based on playlist ID and enabled state.
 */
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
    deletePlaylist,
    isDeleting,
    isLoadingLog,
    isLoadingMetrics,
    isOptimisticallyRunning,
    isToggling,
    lastUpdatedText,
    latestLog,
    metrics,
    setIsOptimisticallyRunning,
    toggleEnabled
  } = usePlaylistRealtime({ config });

  const gradientClass = useMemo(
    () => getMoodGradient(config.id, config.enabled),
    [config.id, config.enabled]
  );

  return (
    <Card
      className={cn(
        'group relative flex h-full min-h-[260px] flex-col overflow-hidden border-0 transition-all duration-500',
        'hover:-translate-y-1 hover:shadow-2xl',
        // Glassmorphism Base
        'bg-card/40 backdrop-blur-xl',
        // Border Gradient Trick
        'before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-linear-to-b before:from-white/10 before:to-white/5 before:p-px',
        !config.enabled && 'opacity-60 grayscale-[0.8] hover:grayscale-0'
      )}
    >
      {/* Dynamic Background Mesh */}
      <div
        className={cn(
          'absolute inset-0 bg-linear-to-br opacity-40 transition-opacity duration-500 group-hover:opacity-60',
          gradientClass
        )}
      />

      <PlaylistCardHeader
        config={config}
        imageUrl={metrics?.imageUrl}
        isToggling={isToggling}
        onToggle={toggleEnabled}
        owner={metrics?.owner}
      />

      <PlaylistCardMetrics
        followers={metrics?.followers}
        isLoading={isLoadingMetrics}
        lastUpdatedDate={metrics?.lastUpdated}
        lastUpdatedText={lastUpdatedText}
        tracks={metrics?.tracks}
      />

      <PlaylistCardFooter
        config={config}
        isOptimisticallyRunning={isOptimisticallyRunning}
        latestLog={latestLog}
        onDelete={() => setShowDeleteDialog(true)}
        onEdit={() => navigate(`/playlist/${config._docId}`)}
        onRunComplete={() => setIsOptimisticallyRunning(false)}
        onRunStart={() => setIsOptimisticallyRunning(true)}
        onShowHistory={() => setShowHistory(true)}
      />

      <PlaylistCardDialogs
        config={config}
        isDeleting={isDeleting}
        isLoadingLog={isLoadingLog}
        latestLog={latestLog}
        onDelete={deletePlaylist}
        setShowDeleteDialog={setShowDeleteDialog}
        setShowHistory={setShowHistory}
        showDeleteDialog={showDeleteDialog}
        showHistory={showHistory}
      />
    </Card>
  );
};

export const PlaylistCardSkeleton = () => (
  <Card className="group border-border/50 bg-card/50 relative h-full overflow-hidden backdrop-blur-sm">
    <div className="bg-muted h-40 w-full animate-pulse" />
    <CardContent className="space-y-3 p-4">
      <div className="bg-muted h-6 w-3/4 animate-pulse rounded" />
      <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
      <div className="flex justify-between pt-2">
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
      </div>
    </CardContent>
  </Card>
);
