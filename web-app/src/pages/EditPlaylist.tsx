import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FirestoreService } from '../services/firestore-service';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { ConfigEditor } from '@/features/playlists/components/ConfigEditor';
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
          toast.error('Playlist not found', {
            description: 'The requested playlist configuration could not be loaded.'
          });
          navigate('/');
        }
      } catch {
        toast.error('Error loading playlist', {
          description: 'Please check your internet connection and try again.'
        });
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
        navigate('/');
        return 'Playlist saved successfully! 💾';
      },
      error: 'Failed to save playlist. Please try again.'
    });
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2 select-none">
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

      {/* Editor Wrapper with Glass Effect */}
      <div className="relative rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl shadow-2xl overflow-hidden p-6 md:p-8">
        {/* Decorative Background Mesh */}
        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 p-24 bg-secondary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <ConfigEditor initialConfig={config} onSubmit={handleSave} />
      </div>
    </div>
  );
}
