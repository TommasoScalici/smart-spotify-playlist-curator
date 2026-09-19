import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useSpotifyStatus } from '@/features/auth/hooks/useSpotifyStatus';
import { cn } from '@/lib/utils';
import { FirestoreService } from '@/services/firestore-service';

import { Header } from './Header';
import { UnlinkAccountDialog } from './UnlinkAccountDialog';

export const MainLayout = () => {
  const { signOut, user } = useAuth();
  const { data: spotifyData, isLoading: checkingLink } = useSpotifyStatus(user?.uid);
  const isSpotifyLinked = spotifyData?.isLinked;
  const queryClient = useQueryClient();
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);

  const handleUnlink = async () => {
    if (!user) return;

    try {
      await FirestoreService.unlinkSpotifyAccount(user.uid);
      queryClient.invalidateQueries({ queryKey: ['spotifyConnection'] });
      toast.success('Spotify account unlinked successfully.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to unlink account.');
    }
  };

  return (
    <div className="layout bg-background text-foreground flex min-h-screen flex-col font-sans antialiased">
      {/* Skip to Content Link for Keyboard Accessibility */}
      <a
        className="bg-primary text-primary-foreground sr-only z-100 rounded-md px-4 py-2 font-bold shadow-lg ring-2 ring-white/20 focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
        href="#main-content"
      >
        Skip to content
      </a>

      <Header
        checkingLink={checkingLink}
        isSpotifyLinked={isSpotifyLinked}
        onOpenUnlinkDialog={() => setShowUnlinkDialog(true)}
        onSignOut={signOut}
        spotifyData={spotifyData}
        user={user}
      />

      <main
        className={cn(
          'main-content animate-fade-in flex flex-1 flex-col',
          !isSpotifyLinked && !checkingLink && 'max-w-none py-0'
        )}
        id="main-content"
      >
        <Outlet />
      </main>

      <UnlinkAccountDialog
        isOpen={showUnlinkDialog}
        onConfirm={handleUnlink}
        onOpenChange={setShowUnlinkDialog}
      />
    </div>
  );
};
