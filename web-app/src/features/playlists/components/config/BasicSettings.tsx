import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SpotifySearch } from '@/features/spotify/components/SpotifySearch';
import { Music, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { FunctionsService } from '@/services/functions-service';
import { useEffect } from 'react';
import { cn, decodeHtmlEntities } from '@/lib/utils';

interface BasicSettingsProps {
  control: Control<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  watch: UseFormWatch<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
}

export const BasicSettings = ({
  control,
  register,
  setValue,
  watch,
  errors
}: BasicSettingsProps) => {
  const playlistId = watch('id');
  const playlistName = watch('name');
  const imageUrl = watch('imageUrl');

  // Fetch playlist details to show rich card and populate description
  const { data: bgMetrics, isLoading: bgLoading } = useQuery({
    queryKey: ['playlist-metrics', playlistId],
    queryFn: () => (playlistId ? FunctionsService.getPlaylistMetrics(playlistId) : null),
    enabled: !!playlistId && playlistId.startsWith('spotify:playlist:'),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Auto-populate description if available and field is empty
  useEffect(() => {
    if (bgMetrics?.description) {
      const currentDesc = watch('settings.description');
      // Only set if completely empty to avoid overwriting user edits (even if read-only now, logic holds)
      if (!currentDesc) {
        setValue('settings.description', decodeHtmlEntities(bgMetrics.description), {
          shouldDirty: true
        });
      }
    }
    // Also sync Image/Owner if missing (Self-Repair)
    if (bgMetrics?.imageUrl && !imageUrl) {
      setValue('imageUrl', bgMetrics.imageUrl);
    }
  }, [bgMetrics, setValue, watch, imageUrl]);

  // Display values: Prefer fetched live data over form data for the preview
  const displayImage = bgMetrics?.imageUrl || imageUrl;
  const displayOwner = bgMetrics?.owner || 'Unknown Author';
  // Note: getPlaylistMetrics DOES NOT return name currently (backend constraint), so we rely on form/search result
  // If we wanted to be 100% sure we could add name to the backend response too. For now form name is fine.
  const displayName = playlistName || playlistId;

  // Note: Parent component handles the metadata state logic (playlistMeta),
  // but for a pure refactor we might want to pass display props or move that logic here.
  // For now, let's assume we can get basic info from the form or we might need to duplicate the
  // "fetch on load" logic or pass it down.
  // To keep it clean, let's try to just use what's in the form or rely on the Search component to populate it.

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Basic Settings</CardTitle>
        <CardDescription>Configure the target playlist and basic details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Playlist Selection */}
        <div className="space-y-2">
          <Label className={cn(errors.id && 'text-destructive')}>
            Target Playlist <span className="text-destructive">*</span>
          </Label>
          {!playlistId ? (
            <Controller
              control={control}
              name="id"
              render={({ field }) => (
                <div
                  className={cn(
                    'transition-all duration-200',
                    errors.id && 'ring-2 ring-destructive ring-offset-2 rounded-md'
                  )}
                >
                  <SpotifySearch
                    type="playlist"
                    placeholder="Select a playlist to curate..."
                    onSelect={(result) => {
                      field.onChange(result.uri);
                      setValue('name', result.name);
                      setValue('imageUrl', result.imageUrl);
                      setValue('ownerId', result.ownerId || 'Unknown');
                      // Set description if available, otherwise fallback to generated one
                      const currentDesc = watch('settings.description');
                      if (!currentDesc) {
                        const decodedDesc = decodeHtmlEntities(result.description);
                        const newDesc =
                          decodedDesc ||
                          `Curated version of ${result.name} by ${result.owner || 'Unknown'}`;
                        setValue('settings.description', newDesc);
                      }
                    }}
                  />
                </div>
              )}
            />
          ) : (
            <div
              className={cn(
                'flex items-center gap-4 p-4 border rounded-md bg-accent/20 relative group overflow-hidden transition-colors',
                errors.id && 'border-destructive ring-1 ring-destructive'
              )}
            >
              {/* Premium "Glass" Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="h-16 w-16 bg-black/40 rounded-md overflow-hidden flex items-center justify-center shrink-0 border border-white/10 shadow-sm relative">
                {bgLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : displayImage ? (
                  <img
                    src={displayImage}
                    alt={displayName}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                ) : (
                  <Music className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0 z-10">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold truncate leading-tight">{displayName}</h4>
                  {bgMetrics?.description && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground border px-1.5 py-0.5 rounded-full hidden sm:inline-block">
                      Original
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  {bgLoading ? (
                    <span className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
                  ) : (
                    <span>by {displayOwner}</span>
                  )}
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs">
                    {bgMetrics?.followers !== undefined
                      ? `${bgMetrics.followers.toLocaleString()} likes`
                      : 'Spotify Playlist'}
                  </span>
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="z-10 hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                onClick={() => {
                  setValue('id', '');
                  setValue('name', '');
                  setValue('imageUrl', undefined);
                  setValue('ownerId', '');
                  setValue('settings.description', '');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {errors.id && <p className="text-sm text-destructive font-medium">{errors.id.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Read-Only)</Label>
          <Textarea
            id="description"
            {...register('settings.description')}
            placeholder="A brief description for the playlist cover."
            className="min-h-[80px] bg-muted cursor-not-allowed resize-none"
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            Description is managed via Spotify or set during creation.
          </p>
          {errors.settings?.description && (
            <p className="text-sm text-destructive">{errors.settings.description.message}</p>
          )}
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-md">
          <div className="space-y-0.5">
            <Label htmlFor="enabled-mode" className="text-base">
              Enable Automation
            </Label>
            <p className="text-sm text-muted-foreground">Allow the AI to update this playlist.</p>
          </div>
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch id="enabled-mode" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
