import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Music, X } from 'lucide-react';
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form';

import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SpotifySearch } from '@/features/spotify/components/SpotifySearch';
import { cn, decodeHtmlEntities } from '@/lib/utils';
import { FunctionsService } from '@/services/functions-service';

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
                    errors.id && 'ring-destructive rounded-md ring-2 ring-offset-2'
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
                'bg-accent/20 group relative flex items-center gap-4 overflow-hidden rounded-md border p-4 transition-colors',
                errors.id && 'border-destructive ring-destructive ring-1'
              )}
            >
              {/* Premium "Glass" Background Effect */}
              <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-r to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40 shadow-sm">
                {bgLoading ? (
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                ) : displayImage ? (
                  <img
                    src={displayImage}
                    alt={displayName}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                ) : (
                  <Music className="text-muted-foreground h-8 w-8" />
                )}
              </div>

              <div className="z-10 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-base leading-tight font-semibold">{displayName}</h4>
                  {bgMetrics?.description && (
                    <span className="text-muted-foreground hidden rounded-full border px-1.5 py-0.5 text-[10px] tracking-wider uppercase sm:inline-block">
                      Original
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-1 truncate text-sm">
                  {bgLoading ? (
                    <span className="bg-muted/50 h-3 w-20 animate-pulse rounded" />
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
                className="hover:bg-destructive/10 hover:text-destructive z-10 shrink-0 transition-colors"
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
          {errors.id && <p className="text-destructive text-sm font-medium">{errors.id.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Read-Only)</Label>
          <Textarea
            id="description"
            {...register('settings.description')}
            placeholder="A brief description for the playlist cover."
            className="bg-muted min-h-[80px] cursor-not-allowed resize-none"
            readOnly
          />
          <p className="text-muted-foreground text-xs">
            Description is managed via Spotify or set during creation.
          </p>
          {errors.settings?.description && (
            <p className="text-destructive text-sm">{errors.settings.description.message}</p>
          )}
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between rounded-md border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="enabled-mode" className="text-base">
              Enable Automation
            </Label>
            <p className="text-muted-foreground text-sm">Allow the AI to update this playlist.</p>
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
