import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { ConfigEditor } from '../components/ConfigEditor';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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

    toast.promise(FirestoreService.saveUserPlaylist(user.uid, data, isNew ? undefined : id), {
      loading: 'Saving configuration...',
      success: () => {
        // Navigate after a short delay or immediately? Standard is fine.
        // We will navigate immediately but the toast will persist due to Toaster being at root.
        navigate('/');
        return 'Playlist saved successfully! 💾';
      },
      error: 'Failed to save playlist. Please try again.'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2 mb-8 select-none">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="w-fit pl-0 hover:bg-transparent hover:text-primary -ml-4 text-muted-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          {isNew ? 'Create New Playlist' : `Edit ${config?.name || 'Playlist'}`}
        </h1>
        <p className="text-muted-foreground">
          {isNew
            ? 'Configure your new automation rules.'
            : 'Update your playlist settings and logic.'}
        </p>
      </div>

      <div className="relative">
        <ConfigEditor initialConfig={config} onSubmit={handleSave} />
      </div>
    </div>
  );
}
