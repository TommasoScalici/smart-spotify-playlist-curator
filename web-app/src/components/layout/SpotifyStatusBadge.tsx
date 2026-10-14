import { CheckCircle2, Unlink, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SpotifyStatusBadgeProps {
  authError?: boolean | string;
  avatarUrl?: null | string;
  displayName?: null | string;
  isLinked?: boolean;
  isLoading?: boolean;
}

export const SpotifyStatusBadge = ({
  authError,
  avatarUrl,
  displayName,
  isLinked,
  isLoading
}: SpotifyStatusBadgeProps) => {
  if (isLoading) return null;

  return (
    <Badge
      className={cn(
        'cursor-default gap-2 border-0 py-1 pr-3 pl-1 transition-all',
        authError
          ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 ring-destructive/20 animate-pulse ring-1'
          : isLinked
            ? 'bg-primary/10 text-primary hover:bg-primary/20 ring-primary/20 ring-1'
            : 'bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-destructive/50 shadow-sm ring-1'
      )}
      variant="outline"
    >
      {authError ? (
        <Link className="flex items-center gap-2 hover:underline" to="/callback">
          <XCircle className="h-4 w-4" />
          <span className="text-xs font-semibold">Reconnect Required</span>
        </Link>
      ) : isLinked ? (
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img
              alt="Spotify"
              className="ring-primary/30 h-5 w-5 rounded-full ring-1"
              src={avatarUrl}
            />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span className="text-xs font-semibold whitespace-nowrap transition-all">
            Connected: <span className="text-foreground">{displayName || 'Spotify'}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Unlink className="h-4 w-4" />
          <span className="text-xs font-bold tracking-tight uppercase">Disconnected</span>
        </div>
      )}
    </Badge>
  );
};
