import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { ConfigEditor } from '../components/ConfigEditor';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function EditPlaylist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PlaylistConfig | undefined>(undefined);
  const [isNew, setIsNew] = useState(false);

  const loadConfig = useCallback(
    async (docId: string, uid: string) => {
      try {
        setLoading(true);
        const playlist = await FirestoreService.getUserPlaylistById(uid, docId);
        if (playlist) {
          setConfig(playlist);
        } else {
          alert('Playlist not found!');
          navigate('/');
        }
      } catch {
        alert('Error loading playlist');
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!user) return;

    if (id === 'new') {
      setIsNew(true);
      setLoading(false);
    } else if (id) {
      loadConfig(id, user.uid);
    }
  }, [id, user, loadConfig]);

  const handleSave = async (data: PlaylistConfig) => {
    if (!user) return;
    try {
      await FirestoreService.saveUserPlaylist(user.uid, data, isNew ? undefined : id);
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
