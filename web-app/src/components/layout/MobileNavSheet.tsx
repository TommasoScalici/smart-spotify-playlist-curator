import { CheckCircle2, History as HistoryIcon, LogOut, Menu, Unlink, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ModeToggle } from '@/components/common/ModeToggle';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MobileNavSheetProps {
  isOpen: boolean;
  isSpotifyLinked?: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenUnlinkDialog: () => void;
  onSignOut: () => void;
  spotifyDisplayName?: null | string;
  user: {
    displayName?: null | string;
    email?: null | string;
    photoURL?: null | string;
  } | null;
}

export const MobileNavSheet = ({
  isOpen,
  isSpotifyLinked,
  onOpenChange,
  onOpenUnlinkDialog,
  onSignOut,
  spotifyDisplayName,
  user
}: MobileNavSheetProps) => {
  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetTrigger asChild>
        <Button aria-label="Open menu" className="md:hidden" size="icon" variant="ghost">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="border-border bg-card/95 w-80 border-l p-0 backdrop-blur-xl"
        side="right"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Access your dashboard and settings</SheetDescription>
        </SheetHeader>
        <div className="max-h-[calc(100vh-5rem)] space-y-4 overflow-y-auto p-4">
          {/* Nav Links */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-2xs px-2 font-bold tracking-wider uppercase">
              Navigation
            </p>
            <Link
              className="bg-accent hover:bg-accent/80 border-border/50 flex items-center gap-3 rounded-xl border p-3 transition-all active:scale-95"
              onClick={() => onOpenChange(false)}
              to="/"
            >
              <HistoryIcon className="text-primary h-4 w-4" />
              <span className="text-sm font-semibold">Dashboard</span>
            </Link>
          </div>

          {/* Spotify Status (Mobile) */}
          {user && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-2xs px-2 font-bold tracking-wider uppercase">
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
                      <p className="text-muted-foreground text-2xs">
                        {isSpotifyLinked ? spotifyDisplayName || 'Active' : 'Action Required'}
                      </p>
                    </div>
                  </div>
                  {isSpotifyLinked && (
                    <Button
                      aria-label="Unlink Spotify account"
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenUnlinkDialog();
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {!isSpotifyLinked && (
                  <Button
                    asChild
                    className="bg-primary hover:bg-primary/90 mt-2 w-full text-xs font-bold"
                    size="sm"
                  >
                    <Link onClick={() => onOpenChange(false)} to="/">
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
              <p className="text-muted-foreground text-2xs px-2 font-bold tracking-wider uppercase">
                Account
              </p>
              <div className="bg-accent border-border/50 flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <img
                    alt="Profile"
                    className="ring-border h-8 w-8 rounded-full object-cover ring-1"
                    src={user.photoURL || undefined}
                  />
                  <div>
                    <p className="max-w-30 truncate text-xs font-bold">{user.displayName}</p>
                    <p className="text-muted-foreground text-2xs max-w-30 truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  aria-label="Log out"
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                  onClick={() => {
                    onOpenChange(false);
                    onSignOut();
                  }}
                  size="icon"
                  variant="ghost"
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
  );
};
