import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ModeToggle } from '@/components/common/ModeToggle';

import { BrandLogo } from './BrandLogo';
import { MobileNavSheet } from './MobileNavSheet';
import { SpotifyStatusBadge } from './SpotifyStatusBadge';
import { UserAccountMenu } from './UserAccountMenu';

interface HeaderProps {
  checkingLink?: boolean;
  isSpotifyLinked?: boolean;
  onOpenUnlinkDialog: () => void;
  onSignOut: () => void;
  spotifyData?: {
    authError?: boolean | string;
    isLinked?: boolean;
    profile?: { avatarUrl?: null | string; displayName?: null | string } | null;
  } | null;
  user: {
    displayName?: null | string;
    email?: null | string;
    photoURL?: null | string;
  } | null;
}

export const Header = ({
  checkingLink,
  isSpotifyLinked,
  onOpenUnlinkDialog,
  onSignOut,
  spotifyData,
  user
}: HeaderProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <header className="layout-header bg-card/50 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="layout-header__content container mx-auto flex h-16 items-center justify-between px-4">
        <BrandLogo />

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <ModeToggle />
          </div>

          <MobileNavSheet
            isOpen={isSheetOpen}
            isSpotifyLinked={isSpotifyLinked}
            onOpenChange={setIsSheetOpen}
            onOpenUnlinkDialog={onOpenUnlinkDialog}
            onSignOut={onSignOut}
            spotifyDisplayName={spotifyData?.profile?.displayName}
            user={user}
          />

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              className="nav-link hover:text-primary text-sm font-medium transition-colors"
              to="/"
            >
              Dashboard
            </Link>

            {user ? (
              <div className="user-profile flex items-center gap-4">
                <SpotifyStatusBadge
                  authError={spotifyData?.authError}
                  avatarUrl={spotifyData?.profile?.avatarUrl}
                  displayName={spotifyData?.profile?.displayName}
                  isLinked={isSpotifyLinked}
                  isLoading={checkingLink}
                />
                <UserAccountMenu
                  isSpotifyLinked={isSpotifyLinked}
                  onOpenUnlinkDialog={onOpenUnlinkDialog}
                  onSignOut={onSignOut}
                  user={user}
                />
              </div>
            ) : (
              <ModeToggle />
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
