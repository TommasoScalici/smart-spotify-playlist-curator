import { useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { PlaylistCard } from '../components/PlaylistCard';
import { RunButton } from '../components/RunButton';
import { Loader2, Plus, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<(PlaylistConfig & { _docId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { user } = useAuth();
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(false);
  const { login } = useSpotifyAuth();

  useEffect(() => {
    if (user) {
      checkLinkStatus(user.uid);
      loadPlaylists(user.uid);
    }
  }, [user]);

  const checkLinkStatus = async (uid: string) => {
    const linked = await FirestoreService.checkSpotifyConnection(uid);
    setIsSpotifyLinked(linked);
  };

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

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your automation rules and monitor curator activity.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/playlist/new')} className="gap-2">
            <Plus className="h-4 w-4" /> New Playlist
          </Button>
          <RunButton />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6 text-sm font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {/* Spotify Link CTA */}
      {!loading && !isSpotifyLinked && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <h3 className="text-xl font-semibold mb-2">Link your Spotify Account</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              To start curating, you need to connect your Spotify account. We need permissions to
              read your playlists and modify them.
            </p>
            <Button onClick={login} className="bg-[#1DB954] hover:bg-[#1ed760] text-white">
              Connect Spotify
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Music className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Playlists Found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  You haven't created any playlist configurations yet.
                </p>
                <Button onClick={() => navigate('/playlist/new')} variant="secondary">
                  Create Your First Playlist
                </Button>
              </CardContent>
            </Card>
          ) : (
            playlists.map((playlist) => <PlaylistCard key={playlist._docId} config={playlist} />)
          )}
        </div>
      )}
    </div>
  );
}
