import { useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { PlaylistCard, PlaylistCardSkeleton } from '../components/PlaylistCard';
import { RunButton } from '../components/RunButton';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useSpotifyStatus } from '../hooks/useSpotifyStatus';
import { OnboardingHero } from '@/components/OnboardingHero';
import { TutorialDialog } from '@/components/TutorialDialog';
import { ActivityFeed } from '@/components/ActivityFeed';

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<(PlaylistConfig & { _docId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuth();
  const { data, isLoading: checkingLink } = useSpotifyStatus(user?.uid);
  const isSpotifyLinked = data?.isLinked;

  useEffect(() => {
    if (user && isSpotifyLinked) {
      const loadPlaylists = async (uid: string) => {
        try {
          setLoading(true);
          const data = await FirestoreService.getUserPlaylists(uid);
          setPlaylists(data);
        } catch (e) {
          console.error(e);
          setError('Failed to load playlists.');
        } finally {
          setLoading(false);
        }
      };

      loadPlaylists(user.uid);
    } else if (!checkingLink && !isSpotifyLinked) {
      setLoading(false);
    }
  }, [user, isSpotifyLinked, checkingLink]);

  // Loading state (initial check)
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

  // Not Connected State: Show Onboarding Hero exclusively
  if (!isSpotifyLinked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
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

      {
        error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6 text-sm font-medium border border-destructive/20">
            {error}
          </div>
        ) /* ... hide error and content properly ... */
      }

      {/* Content Area */}
      {playlists.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          {/* Playlist Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist._docId} config={playlist} />
            ))}
          </div>

          {/* Side Panel: Activity Feed */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ActivityFeed />
            </div>
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
      {/* Tutorial Dialog for New Users */}
      <TutorialDialog
        open={playlists.length === 0 && !error && !tutorialDismissed}
        onOpenChange={(open) => {
          if (!open) setTutorialDismissed(true);
        }}
      />
    </div>
  );
}
