import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ModeToggle } from '../common/ModeToggle';

import { useSpotifyStatus } from '../../hooks/useSpotifyStatus';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  LogOut,
  CheckCircle2,
  XCircle,
  Unlink,
  AlertTriangle,
  Menu,
  History as HistoryIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirestoreService } from '../../services/firestore-service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const MainLayout = () => {
  const { user, signOut } = useAuth();
  const { data, isLoading: checkingLink } = useSpotifyStatus(user?.uid);
  const isSpotifyLinked = data?.isLinked;
  const queryClient = useQueryClient();
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    <div className="layout min-h-screen flex flex-col bg-background text-foreground font-sans antialiased">
      {/* Skip to Content Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-primary text-primary-foreground font-bold rounded-md shadow-lg ring-2 ring-white/20"
      >
        Skip to content
      </a>

      <header className="layout-header border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="layout-header__content container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="brand-logo flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="brand-logo__icon text-2xl">🎧</span>
            <span className="font-bold text-lg">
              Smart <span className="text-primary">Curator</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <ModeToggle />
            </div>

            {/* Mobile Menu Trigger (Sheet) */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-80 p-0 border-l border-border bg-card/95 backdrop-blur-xl"
              >
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Access your dashboard and settings</SheetDescription>
                </SheetHeader>
                <div className="max-h-[calc(100vh-5rem)] overflow-y-auto p-4 space-y-4">
                  {/* Nav Links */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                      Navigation
                    </p>
                    <Link
                      to="/"
                      onClick={() => setIsSheetOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-accent hover:bg-accent/80 border border-border/50 transition-all active:scale-95"
                    >
                      <HistoryIcon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Dashboard</span>
                    </Link>
                  </div>

                  {/* Spotify Status (Mobile) */}
                  {user && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                        Spotify
                      </p>
                      <div
                        className={cn(
                          'p-3 rounded-xl border transition-all',
                          isSpotifyLinked
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-destructive/10 border-destructive/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'h-8 w-8 rounded-lg flex items-center justify-center',
                                isSpotifyLinked
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-destructive/20 text-destructive'
                              )}
                            >
                              {isSpotifyLinked ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold">
                                {isSpotifyLinked ? 'Connected' : 'Disconnected'}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {isSpotifyLinked
                                  ? data?.profile?.displayName || 'Active'
                                  : 'Action Required'}
                              </p>
                            </div>
                          </div>
                          {isSpotifyLinked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              aria-label="Unlink Spotify account"
                              onClick={() => {
                                setIsSheetOpen(false);
                                setShowUnlinkDialog(true);
                              }}
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {!isSpotifyLinked && (
                          <Button
                            asChild
                            size="sm"
                            className="w-full mt-2 bg-primary hover:bg-primary/90 font-bold text-xs"
                          >
                            <Link to="/" onClick={() => setIsSheetOpen(false)}>
                              Connect Account
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* User Profile (Mobile) */}
                  {user && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                        Account
                      </p>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-accent border border-border/50">
                        <div className="flex items-center gap-2">
                          <img
                            src={user.photoURL || undefined}
                            alt="Profile"
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                          />
                          <div>
                            <p className="text-xs font-bold truncate max-w-[120px]">
                              {user.displayName}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsSheetOpen(false);
                            signOut();
                          }}
                          aria-label="Log out"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-accent border border-border/50">
                    <span className="text-xs font-semibold">Appearance</span>
                    <ModeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="nav-link text-sm font-medium hover:text-primary transition-colors"
              >
                Dashboard
              </Link>

              {user ? (
                <div className="user-profile flex items-center gap-4">
                  {/* Spotify Status Badge (Desktop) */}
                  {!checkingLink && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'gap-2 transition-all border-0 pl-1 pr-3 py-1 cursor-default',
                        data?.authError
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 ring-1 ring-destructive/20 animate-pulse'
                          : isSpotifyLinked
                            ? 'bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/20'
                            : 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 ring-1 ring-destructive/50'
                      )}
                    >
                      {data?.authError ? (
                        <Link to="/callback" className="flex items-center gap-2 hover:underline">
                          <XCircle className="h-4 w-4" />
                          <span className="font-semibold text-xs">Reconnect Required</span>
                        </Link>
                      ) : isSpotifyLinked ? (
                        <div className="flex items-center gap-2">
                          {data?.profile?.avatarUrl ? (
                            <img
                              src={data.profile.avatarUrl}
                              alt="Spotify"
                              className="h-5 w-5 rounded-full ring-1 ring-primary/30"
                            />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          <span className="font-semibold text-xs transition-all whitespace-nowrap">
                            Connected:{' '}
                            <span className="text-foreground">
                              {data?.profile?.displayName || 'Spotify'}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Unlink className="h-4 w-4" />
                          <span className="font-bold text-xs uppercase tracking-tight">
                            Disconnected
                          </span>
                        </div>
                      )}
                    </Badge>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        aria-label="User profile menu"
                        className="relative h-9 w-9 rounded-full p-0 overflow-hidden border border-input shadow-sm hover:ring-2 hover:ring-primary/20 transition-all"
                      >
                        <img
                          src={user.photoURL || undefined}
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
                            onSelect={(e: Event) => {
                              e.preventDefault();
                              setShowUnlinkDialog(true);
                            }}
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
              ) : (
                <ModeToggle />
              )}
            </nav>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          'main-content animate-fade-in flex-1 flex flex-col',
          !isSpotifyLinked && !checkingLink && 'py-0 max-w-none'
        )}
      >
        <Outlet />
      </main>

      {/* Premium Unlink Confirmation Modal */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">
                Unlink Spotify Account?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
              This will stop all automated playlist curations and clear your Spotify profile data
              from our system.
              <span className="block mt-2 font-medium text-destructive/80 italic">
                You'll need to re-link your account to resume automation.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white transition-all">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-lg shadow-destructive/20 active:scale-95 transition-all"
            >
              Unlink Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
