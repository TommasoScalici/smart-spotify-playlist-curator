import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { History, Plus, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { ActivityDiffModal } from '@/features/dashboard/components/ActivityDiffModal';
import { ActivityDrawer } from '@/features/dashboard/components/ActivityDrawer';
import { OnboardingHero } from '@/features/dashboard/components/OnboardingHero';
import { TutorialDialog } from '@/features/dashboard/components/TutorialDialog';
import { PlaylistCard, PlaylistCardSkeleton } from '@/features/playlists/components/PlaylistCard';
import { ActivityLog } from '@/hooks/useActivityFeed';

import { useAuth } from '../contexts/AuthContext';
import { useSpotifyStatus } from '../hooks/useSpotifyStatus';
import { FirestoreService } from '../services/firestore-service';

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<({ _docId: string } & PlaylistConfig)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tutorialDismissed, setTutorialDismissed] = useState(() => {
    return localStorage.getItem('tutorial_dismissed') === 'true';
  });
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const navigate = useNavigate();

  const { user } = useAuth();
  const { data, isLoading: checkingLink } = useSpotifyStatus(user?.uid);
  const isSpotifyLinked = data?.isLinked;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user?.uid && isSpotifyLinked) {
      // Use microtask to avoid synchronous state update in effect body
      queueMicrotask(() => {
        setLoading(true);
        setError('');
      });

      unsubscribe = FirestoreService.subscribeUserPlaylists(user.uid, (data) => {
        setPlaylists(data);
        setLoading(false);
      });
    } else {
      queueMicrotask(() => setLoading(false));
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, isSpotifyLinked]);

  const handleDismissTutorial = () => {
    setTutorialDismissed(true);
    localStorage.setItem('tutorial_dismissed', 'true');
  };

  if (checkingLink || (loading && isSpotifyLinked)) {
    return (
      <div className="container mx-auto max-w-7xl animate-pulse p-4 md:p-6">
        <div className="bg-muted mb-2 h-10 w-48 rounded" />
        <div className="bg-muted mb-8 h-4 w-96 rounded" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PlaylistCardSkeleton />
          <PlaylistCardSkeleton />
          <PlaylistCardSkeleton />
        </div>
      </div>
    );
  }

  if (!isSpotifyLinked) {
    return (
      <div className="flex min-h-full w-full flex-1 flex-col items-center justify-center overflow-y-auto p-4 sm:p-6 md:p-8">
        <OnboardingHero />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end md:gap-4">
        <div>
          <h1 className="from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your automation rules and monitor curator activity.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <Button
            className="group text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 min-h-[44px] w-full gap-2 border-white/10 bg-white/5 transition-all sm:w-auto"
            onClick={() => setIsActivityDrawerOpen(true)}
            variant="outline"
          >
            <History className="h-4 w-4" /> Activity
          </Button>
          <Button
            className="group shadow-secondary/10 hover:shadow-secondary/20 bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20 min-h-[44px] w-full gap-2 border shadow-lg backdrop-blur-sm transition-all hover:scale-105 sm:w-auto"
            onClick={() => navigate('/playlist/new')}
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" /> New
            Playlist
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive border-destructive/20 mb-6 flex items-center justify-between rounded-md border p-4 text-sm font-medium">
          <span>{error}</span>
          <Button
            className="border-destructive/20 hover:bg-destructive/20 text-destructive hover:text-destructive"
            onClick={() => window.location.reload()}
            size="sm"
            variant="outline"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Content Area */}
      {playlists.length > 0 ? (
        <div className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <PlaylistCard config={playlist} key={playlist._docId} />
            ))}
          </div>
        </div>
      ) : (
        !error && (
          <div className="animate-in fade-in zoom-in py-20 text-center duration-500">
            <h3 className="mb-4 text-2xl font-bold">No Playlists Configured</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Create your first automated playlist to get started.
            </p>
            <Button
              className="hover:shadow-primary/20 shadow-lg"
              onClick={() => navigate('/playlist/new')}
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" /> Create New Playlist
            </Button>
          </div>
        )
      )}

      {/* Activity Toggleable Side Panel */}
      <ActivityDrawer
        onActivitySelect={(activity: ActivityLog) => setSelectedActivity(activity)}
        onOpenChange={setIsActivityDrawerOpen}
        open={isActivityDrawerOpen}
      />

      <ActivityDiffModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        open={!!selectedActivity}
      />

      <TutorialDialog
        onOpenChange={(open) => {
          if (!open) handleDismissTutorial();
        }}
        open={playlists.length === 0 && !error && !tutorialDismissed}
      />
    </div>
  );
}
