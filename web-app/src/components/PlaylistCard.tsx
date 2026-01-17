import { useNavigate } from 'react-router-dom';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Edit2, Music } from 'lucide-react';
import { RunButton } from './RunButton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlaylistCardProps {
  config: PlaylistConfig & { _docId: string };
}

export const PlaylistCard = ({ config }: PlaylistCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col h-full min-h-[220px] hover:border-primary/50 transition-colors">
      <CardHeader className="flex-row gap-4 space-y-0 pb-4">
        {/* Cover Image */}
        {config.imageUrl ? (
          <div className="h-16 w-16 rounded-md overflow-hidden shrink-0 shadow-md">
            <img src={config.imageUrl} alt={config.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Music className="h-8 w-8 text-primary" />
          </div>
        )}

        {/* Title & Owner */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold leading-tight truncate" title={config.name}>
            {config.name}
          </h3>
          {config.owner && (
            <p className="text-xs text-muted-foreground mt-1 truncate">by {config.owner}</p>
          )}
          <div className="mt-2">
            <Badge
              variant={config.enabled ? 'default' : 'secondary'}
              className={cn('text-[10px] px-2 h-5', !config.enabled && 'opacity-50')}
            >
              {config.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {config.settings.description || 'No description provided.'}
        </p>
      </CardContent>

      <CardFooter className="pt-4 border-t gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => navigate(`/playlist/${config._docId}`)}
        >
          <Edit2 className="h-4 w-4" />
          Edit
        </Button>
        <div className="shrink-0">
          <RunButton playlistId={config.id} iconOnly={true} />
        </div>
      </CardFooter>
    </Card>
  );
};
