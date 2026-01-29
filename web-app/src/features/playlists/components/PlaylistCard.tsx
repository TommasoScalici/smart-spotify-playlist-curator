import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { usePlaylistRealtime } from '../hooks/usePlaylistRealtime';
import { PlaylistCardDialogs } from './card-parts/PlaylistCardDialogs';
import { PlaylistCardFooter } from './card-parts/PlaylistCardFooter';
import { PlaylistCardHeader } from './card-parts/PlaylistCardHeader';
import { PlaylistCardMetrics } from './card-parts/PlaylistCardMetrics';

interface PlaylistCardProps {
  config: PlaylistConfig & { _docId: string };
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
    metrics,
    isLoadingMetrics,
    latestLog,
    isLoadingLog,
    isOptimisticallyRunning,
    lastUpdatedText,
    toggleEnabled,
    isToggling,
    deletePlaylist,
    isDeleting,
    runTestCuration,
    setIsOptimisticallyRunning
  } = usePlaylistRealtime({ config });

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
        'before:absolute before:inset-0 before:p-px before:-z-10 before:rounded-xl before:bg-linear-to-b before:from-white/10 before:to-white/5',
        !config.enabled && 'opacity-60 grayscale-[0.8] hover:grayscale-0'
      )}
    >
      {/* Dynamic Background Mesh */}
      <div
        className={cn(
          'absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-60 bg-linear-to-br',
          gradientClass
        )}
      />

      <PlaylistCardHeader
        config={config}
        imageUrl={metrics?.imageUrl}
        owner={metrics?.owner}
        isToggling={isToggling}
        onToggle={toggleEnabled}
      />

      <PlaylistCardMetrics
        isLoading={isLoadingMetrics}
        followers={metrics?.followers}
        lastUpdatedText={lastUpdatedText}
        lastUpdatedDate={metrics?.lastUpdated}
        tracks={metrics?.tracks}
      />

      <PlaylistCardFooter
        config={config}
        latestLog={latestLog}
        isOptimisticallyRunning={isOptimisticallyRunning}
        onEdit={() => navigate(`/playlist/${config._docId}`)}
        onDelete={() => setShowDeleteDialog(true)}
        onRunStart={() => setIsOptimisticallyRunning(true)}
        onRunComplete={() => setIsOptimisticallyRunning(false)}
        onRunTest={runTestCuration}
        onShowHistory={() => setShowHistory(true)}
      />

      <PlaylistCardDialogs
        config={config}
        latestLog={latestLog}
        isLoadingLog={isLoadingLog}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        isDeleting={isDeleting}
        onDelete={deletePlaylist}
      />
    </Card>
  );
};

export const PlaylistCardSkeleton = () => (
  <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm h-full">
    <div className="h-40 w-full bg-muted animate-pulse" />
    <CardContent className="p-4 space-y-3">
      <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
      <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
      <div className="flex justify-between pt-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    </CardContent>
  </Card>
);
