import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { ConfigEditor } from '../components/ConfigEditor';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function EditPlaylist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PlaylistConfig | undefined>(undefined);
  const [isNew, setIsNew] = useState(false);

  const loadConfig = useCallback(
    async (docId: string) => {
      try {
        setLoading(true);
        const playlist = await FirestoreService.getPlaylistById(docId);
        if (playlist) {
          setConfig(playlist);
        } else {
          // setError('Playlist not found'); // Original code had alert and navigate
          alert('Playlist not found!');
          navigate('/');
        }
      } catch {
        // setError('Failed to load playlist configuration.'); // Original code had alert
        alert('Error loading playlist');
        // Silent error
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (id === 'new') {
      setIsNew(true);
      setLoading(false);
    } else if (id) {
      loadConfig(id);
    }
  }, [id, loadConfig]);

  const handleSave = async (data: PlaylistConfig) => {
    try {
      await FirestoreService.savePlaylist(data, isNew ? undefined : id);
      navigate('/');
    } catch {
      alert('Failed to save playlist.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <h1 style={{ fontSize: '2rem' }}>
          {isNew ? 'Create New Playlist' : `Edit ${config?.name || 'Playlist'}`}
        </h1>
      </div>

      <ConfigEditor initialConfig={config} onSubmit={handleSave} />
    </div>
  );
}
