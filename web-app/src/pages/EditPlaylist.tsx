import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfigEditor } from '@/features/playlists/components/ConfigEditor';

import { useAuth } from '../contexts/AuthContext';
import { FirestoreService } from '../services/firestore-service';

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
      error: 'Failed to save playlist. Please try again.',
      loading: 'Saving configuration...',
      success: () => {
        navigate('/');
        return 'Playlist saved successfully! 💾';
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="text-primary h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 container mx-auto min-h-screen max-w-4xl space-y-8 py-8 duration-700">
      {/* Header Section */}
      <div className="flex flex-col gap-2 select-none">
        <Button
          className="hover:text-primary text-muted-foreground -ml-4 w-fit pl-0 transition-colors hover:bg-transparent"
          onClick={() => navigate('/')}
          variant="ghost"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
          {isNew ? 'Create New Playlist' : `Edit ${config?.name || 'Playlist'}`}
        </h1>
        <p className="text-muted-foreground">
          {isNew
            ? 'Configure your new automation rules.'
            : 'Update your playlist settings and logic.'}
        </p>
      </div>

      {/* Editor Wrapper with Glass Effect */}
      <div className="bg-card/30 relative overflow-hidden rounded-xl border border-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        {/* Decorative Background Mesh */}
        <div className="bg-primary/5 pointer-events-none absolute top-0 right-0 -z-10 rounded-full p-32 blur-3xl" />
        <div className="bg-secondary/5 pointer-events-none absolute bottom-0 left-0 -z-10 rounded-full p-24 blur-3xl" />

        <ConfigEditor initialConfig={config} isAddMode={isNew} onSubmit={handleSave} />
      </div>
    </div>
  );
}
