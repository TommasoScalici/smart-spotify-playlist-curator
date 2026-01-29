import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  History as HistoryIcon,
  LogOut,
  Menu,
  Unlink,
  XCircle
} from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { useAuth } from '../../contexts/AuthContext';
import { useSpotifyStatus } from '../../hooks/useSpotifyStatus';
import { FirestoreService } from '../../services/firestore-service';
import { ModeToggle } from '../common/ModeToggle';

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
    <div className="layout bg-background text-foreground flex min-h-screen flex-col font-sans antialiased">
      {/* Skip to Content Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-100 rounded-md px-4 py-2 font-bold shadow-lg ring-2 ring-white/20 focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to content
      </a>

      <header className="layout-header bg-card/50 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="layout-header__content container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            to="/"
            className="brand-logo flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="brand-logo__icon text-2xl">🎧</span>
            <span className="text-lg font-bold">
              Smart <span className="text-primary">Curator</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 md:flex">
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
                className="border-border bg-card/95 w-80 border-l p-0 backdrop-blur-xl"
              >
                <SheetHeader className="border-b p-4">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Access your dashboard and settings</SheetDescription>
                </SheetHeader>
                <div className="max-h-[calc(100vh-5rem)] space-y-4 overflow-y-auto p-4">
                  {/* Nav Links */}
                  <div className="space-y-2">
                    <p className="text-muted-foreground px-2 text-[10px] font-bold tracking-wider uppercase">
                      Navigation
                    </p>
                    <Link
                      to="/"
                      onClick={() => setIsSheetOpen(false)}
                      className="bg-accent hover:bg-accent/80 border-border/50 flex items-center gap-3 rounded-xl border p-3 transition-all active:scale-95"
                    >
                      <HistoryIcon className="text-primary h-4 w-4" />
                      <span className="text-sm font-semibold">Dashboard</span>
                    </Link>
                  </div>

                  {/* Spotify Status (Mobile) */}
                  {user && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground px-2 text-[10px] font-bold tracking-wider uppercase">
                        Spotify
                      </p>
                      <div
                        className={cn(
                          'rounded-xl border p-3 transition-all',
                          isSpotifyLinked
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-destructive/10 border-destructive/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg',
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
                              <p className="text-muted-foreground text-[10px]">
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
                              className="text-destructive hover:bg-destructive/10 h-8 w-8"
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
                            className="bg-primary hover:bg-primary/90 mt-2 w-full text-xs font-bold"
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
                      <p className="text-muted-foreground px-2 text-[10px] font-bold tracking-wider uppercase">
                        Account
                      </p>
                      <div className="bg-accent border-border/50 flex items-center justify-between rounded-xl border p-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={user.photoURL || undefined}
                            alt="Profile"
                            className="ring-border h-8 w-8 rounded-full object-cover ring-1"
                          />
                          <div>
                            <p className="max-w-[120px] truncate text-xs font-bold">
                              {user.displayName}
                            </p>
                            <p className="text-muted-foreground max-w-[120px] truncate text-[10px]">
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
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Theme Toggle */}
                  <div className="bg-accent border-border/50 flex items-center justify-between rounded-xl border p-3">
                    <span className="text-xs font-semibold">Appearance</span>
                    <ModeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <nav className="hidden items-center gap-6 md:flex">
              <Link
                to="/"
                className="nav-link hover:text-primary text-sm font-medium transition-colors"
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
                        'cursor-default gap-2 border-0 py-1 pr-3 pl-1 transition-all',
                        data?.authError
                          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 ring-destructive/20 animate-pulse ring-1'
                          : isSpotifyLinked
                            ? 'bg-primary/10 text-primary hover:bg-primary/20 ring-primary/20 ring-1'
                            : 'bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-destructive/50 shadow-sm ring-1'
                      )}
                    >
                      {data?.authError ? (
                        <Link to="/callback" className="flex items-center gap-2 hover:underline">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs font-semibold">Reconnect Required</span>
                        </Link>
                      ) : isSpotifyLinked ? (
                        <div className="flex items-center gap-2">
                          {data?.profile?.avatarUrl ? (
                            <img
                              src={data.profile.avatarUrl}
                              alt="Spotify"
                              className="ring-primary/30 h-5 w-5 rounded-full ring-1"
                            />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          <span className="text-xs font-semibold whitespace-nowrap transition-all">
                            Connected:{' '}
                            <span className="text-foreground">
                              {data?.profile?.displayName || 'Spotify'}
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Unlink className="h-4 w-4" />
                          <span className="text-xs font-bold tracking-tight uppercase">
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
                        className="border-input hover:ring-primary/20 relative h-9 w-9 overflow-hidden rounded-full border p-0 shadow-sm transition-all hover:ring-2"
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
                          <p className="text-sm leading-none font-medium">{user.displayName}</p>
                          <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
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
          'main-content animate-fade-in flex flex-1 flex-col',
          !isSpotifyLinked && !checkingLink && 'max-w-none py-0'
        )}
      >
        <Outlet />
      </main>

      {/* Premium Unlink Confirmation Modal */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="bg-destructive/10 rounded-full p-2">
                <AlertTriangle className="text-destructive h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">
                Unlink Spotify Account?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
              This will stop all automated playlist curations and clear your Spotify profile data
              from our system.
              <span className="text-destructive/80 mt-2 block font-medium italic">
                You'll need to re-link your account to resume automation.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white transition-all hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20 font-semibold shadow-lg transition-all active:scale-95"
            >
              Unlink Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
