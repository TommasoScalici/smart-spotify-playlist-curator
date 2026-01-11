import { useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { PlaylistCard } from '../components/PlaylistCard';
import { RunButton } from '../components/RunButton';
import { Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<(PlaylistConfig & { _docId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await FirestoreService.getAllPlaylists();
      setPlaylists(data);
    } catch {
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
