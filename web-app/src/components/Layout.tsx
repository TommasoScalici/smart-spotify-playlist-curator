import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ModeToggle } from './mode-toggle';

import { useSpotifyStatus } from '../hooks/useSpotifyStatus';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut, CheckCircle2, XCircle, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirestoreService } from '../services/firestore-service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const Layout = () => {
  const { user, signOut } = useAuth();
  const { data, isLoading: checkingLink } = useSpotifyStatus(user?.uid);
  const isSpotifyLinked = data?.isLinked;
  const queryClient = useQueryClient();

  const handleUnlink = async () => {
    if (
      !user ||
      !window.confirm('Are you sure you want to unlink your Spotify account? Automation will stop.')
    )
      return;

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
    <div className="layout min-h-screen flex flex-col bg-background text-foreground font-sans antialiased">
      <header className="layout-header border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="layout-header__content container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="brand-logo flex items-center gap-2">
            <span className="brand-logo__icon text-2xl">🎧</span>
            <span className="font-bold text-lg">
              Smart <span className="text-primary">Curator</span>
            </span>
          </div>

          <nav className="nav-menu flex items-center gap-4">
            <Link
              to="/"
              className="nav-link text-sm font-medium hover:text-primary transition-colors"
            >
              Dashboard
            </Link>

            {user && (
              <div className="user-profile flex items-center gap-4">
                {/* Spotify Status Badge */}
                {!checkingLink && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-2 transition-all border-0 pl-1 pr-3 py-1 cursor-default',
                      data?.authError
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 ring-1 ring-destructive/20 animate-pulse'
                        : isSpotifyLinked
                          ? 'bg-[#1DB954]/10 text-[#1DB954] hover:bg-[#1DB954]/20 ring-1 ring-[#1DB954]/20'
                          : 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 ring-1 ring-destructive/50'
                    )}
                  >
                    {data?.authError ? (
                      <Link to="/callback" className="flex items-center gap-2 hover:underline">
                        <XCircle className="h-4 w-4" />
                        <span className="font-semibold">Reconnect Required</span>
                      </Link>
                    ) : isSpotifyLinked ? (
                      <div className="flex items-center gap-2">
                        {data?.profile?.avatarUrl ? (
                          <img
                            src={data.profile.avatarUrl}
                            alt="Spotify"
                            className="h-5 w-5 rounded-full ring-1 ring-[#1DB954]/30"
                          />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-xs transition-all">
                          Connected to Spotify as:{' '}
                          <span className="text-white">
                            {data?.profile?.displayName || 'Unknown User'}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Unlink className="h-4 w-4" />
                        <span className="font-bold text-xs">Not Spotify Connected</span>
                      </div>
                    )}
                  </Badge>
                )}

                <div className="flex items-center gap-2">
                  <ModeToggle />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full p-0 overflow-hidden border border-input shadow-sm hover:ring-2 hover:ring-primary/20 transition-all"
                      >
                        <img
                          src={user.photoURL || ''}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {isSpotifyLinked && (
                        <>
                          <DropdownMenuItem
                            onClick={handleUnlink}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Unlink className="mr-2 h-4 w-4" />
                            <span>Unlink Spotify</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={signOut}
                        className="focus:text-destructive/80 cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main
        className={cn(
          'main-content animate-fade-in flex-1 flex flex-col',
          !isSpotifyLinked && !checkingLink && 'py-0 max-w-none'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
};
