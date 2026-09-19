import { LogOut, Unlink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface UserAccountMenuProps {
  isSpotifyLinked?: boolean;
  onOpenUnlinkDialog: () => void;
  onSignOut: () => void;
  user: {
    displayName?: null | string;
    email?: null | string;
    photoURL?: null | string;
  };
}

export const UserAccountMenu = ({
  isSpotifyLinked,
  onOpenUnlinkDialog,
  onSignOut,
  user
}: UserAccountMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="User profile menu"
          className="border-input hover:ring-primary/20 relative h-9 w-9 overflow-hidden rounded-full border p-0 shadow-sm transition-all hover:ring-2"
          variant="ghost"
        >
          <img
            alt="Profile"
            className="h-full w-full object-cover"
            src={user.photoURL || undefined}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
              className="text-destructive focus:text-destructive cursor-pointer"
              onSelect={(e: Event) => {
                e.preventDefault();
                onOpenUnlinkDialog();
              }}
            >
              <Unlink className="mr-2 h-4 w-4" />
              <span>Unlink Spotify</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="focus:text-destructive/80 cursor-pointer" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
