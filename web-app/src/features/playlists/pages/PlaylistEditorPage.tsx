import { ArrowLeft, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ConfigEditor } from '@/features/playlists/components/ConfigEditor';
import { usePlaylistEditor } from '@/features/playlists/hooks/usePlaylistEditor';

export default function EditPlaylist() {
  const { id } = useParams();
  const { user } = useAuth();

  const { config, handleCancel, handleSave, isNew, loading } = usePlaylistEditor(id, user?.uid);

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
          onClick={handleCancel}
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

        <ConfigEditor
          initialConfig={config}
          isAddMode={isNew}
          onCancel={handleCancel}
          onSubmit={handleSave}
        />
      </div>
    </div>
  );
}
