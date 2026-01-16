import { useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { PlaylistCard } from '../components/PlaylistCard';
import { RunButton } from '../components/RunButton';
import { Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';

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
    <div>
      <div
        className="dashboard-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}
      >
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Manage your automation rules and monitor curator activity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'white'
            }}
            onClick={() => navigate('/playlist/new')}
          >
            <Plus size={18} style={{ marginRight: '8px' }} /> New Playlist
          </button>
          <RunButton />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!loading && !isSpotifyLinked && (
        <div
          className="glass-panel"
          style={{ marginBottom: '24px', textAlign: 'center', borderColor: '#1db954' }}
        >
          <h3>Link your Spotify Account</h3>
          <p className="text-secondary" style={{ marginBottom: '16px' }}>
            To start curating, you need to connect your Spotify account.
          </p>
          <button
            className="btn-primary"
            style={{ background: '#1db954', border: 'none' }}
            onClick={login}
          >
            Link Spotify
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
      ) : (
        <div className="dashboard-grid">
          {playlists.length === 0 ? (
            <div
              className="glass-panel"
              style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px' }}
            >
              <h3 style={{ marginBottom: '16px' }}>No Playlists Found</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                You haven't created any playlist configurations yet.
              </p>
              <button className="btn-primary" onClick={() => navigate('/playlist/new')}>
                Create Your First Playlist
              </button>
            </div>
          ) : (
            playlists.map((playlist) => <PlaylistCard key={playlist._docId} config={playlist} />)
          )}
        </div>
      )}
    </div>
  );
}
