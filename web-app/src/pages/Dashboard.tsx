import { useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { PlaylistCard, PlaylistCardSkeleton } from '@/features/playlists/components/PlaylistCard';
import { RunButton } from '@/features/playlists/components/RunButton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useSpotifyStatus } from '../hooks/useSpotifyStatus';
import { OnboardingHero } from '@/features/dashboard/components/OnboardingHero';
import { TutorialDialog } from '@/features/dashboard/components/TutorialDialog';
import { ActivityDrawer } from '@/features/dashboard/components/ActivityDrawer';
import { Plus, RefreshCcw, History } from 'lucide-react';
import { useCallback } from 'react';

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<(PlaylistConfig & { _docId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuth();
  const { data, isLoading: checkingLink } = useSpotifyStatus(user?.uid);
  const isSpotifyLinked = data?.isLinked;

  const fetchPlaylists = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      setError('');
      const data = await FirestoreService.getUserPlaylists(user.uid);
      setPlaylists(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load playlists.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isSpotifyLinked) {
      fetchPlaylists();
    } else if (!checkingLink && !isSpotifyLinked) {
      setLoading(false);
    }
  }, [user, isSpotifyLinked, checkingLink, fetchPlaylists]);

  if (checkingLink || (loading && isSpotifyLinked)) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl animate-pulse">
        <div className="h-10 w-48 bg-muted rounded mb-2" />
        <div className="h-4 w-96 bg-muted rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PlaylistCardSkeleton />
          <PlaylistCardSkeleton />
          <PlaylistCardSkeleton />
        </div>
      </div>
    );
  }

  if (!isSpotifyLinked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-full overflow-y-auto">
        <OnboardingHero />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 md:gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your automation rules and monitor curator activity.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsActivityDrawerOpen(true)}
            className="group gap-2 border-white/10 bg-white/5 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all w-full sm:w-auto min-h-[44px]"
          >
            <History className="h-4 w-4" /> Activity
          </Button>
          <Button
            onClick={() => navigate('/playlist/new')}
            className="group gap-2 shadow-lg shadow-secondary/10 hover:shadow-secondary/20 hover:scale-105 transition-all bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 backdrop-blur-sm w-full sm:w-auto min-h-[44px]"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" /> New
            Playlist
          </Button>
          <div className="w-full sm:w-auto">
            <RunButton className="w-full sm:w-auto min-h-[44px] shadow-lg shadow-tertiary/10" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6 text-sm font-medium border border-destructive/20 flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlaylists}
            className="border-destructive/20 hover:bg-destructive/20 text-destructive hover:text-destructive"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Content Area */}
      {playlists.length > 0 ? (
        <div className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist._docId} config={playlist} />
            ))}
          </div>
        </div>
      ) : (
        !error && (
          <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
            <h3 className="text-2xl font-bold mb-4">No Playlists Configured</h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Create your first automated playlist to get started.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/playlist/new')}
              className="shadow-lg hover:shadow-primary/20"
            >
              <Plus className="mr-2 h-5 w-5" /> Create New Playlist
            </Button>
          </div>
        )
      )}

      {/* Activity Toggleable Side Panel */}
      <ActivityDrawer open={isActivityDrawerOpen} onOpenChange={setIsActivityDrawerOpen} />

      <TutorialDialog
        open={playlists.length === 0 && !error && !tutorialDismissed}
        onOpenChange={(open) => {
          if (!open) setTutorialDismissed(true);
        }}
      />
    </div>
  );
}
