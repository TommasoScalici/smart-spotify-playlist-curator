import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Music, X } from 'lucide-react';
import { useEffect } from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LabelWithTooltip } from '@/components/ui/label-with-tooltip';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SpotifySearch } from '@/features/spotify/components/SpotifySearch';
import { cn, decodeHtmlEntities } from '@/lib/utils';
import { FunctionsService } from '@/services/functions-service';

interface BasicSettingsProps {
  control: Control<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  watch: UseFormWatch<PlaylistConfig>;
}

export const BasicSettings = ({
  control,
  errors,
  register,
  setValue,
  watch
}: BasicSettingsProps) => {
  const playlistId = watch('id');
  const playlistName = watch('name');
  const imageUrl = watch('imageUrl');

  // Fetch playlist details to show rich card and populate description
  const { data: bgMetrics, isLoading: bgLoading } = useQuery({
    enabled: !!playlistId && playlistId.startsWith('spotify:playlist:'),
    queryFn: () => (playlistId ? FunctionsService.getPlaylistMetrics(playlistId) : null),
    queryKey: ['playlist-metrics', playlistId],
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
          <LabelWithTooltip
            className={cn(errors.id && 'text-destructive')}
            tooltip="The actual Spotify playlist that will be updated. You must be the owner to allow updates."
          >
            Target Playlist <span className="text-destructive">*</span>
          </LabelWithTooltip>
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
                    placeholder="Select a playlist to curate..."
                    type="playlist"
                  />
                </div>
              )}
            />
          ) : (
            <div
              className={cn(
                'bg-card group hover:bg-accent/5 hover:border-primary/20 relative flex flex-col items-start gap-4 overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md sm:flex-row sm:items-center',
                errors.id && 'border-destructive ring-destructive ring-1'
              )}
            >
              {/* Premium "Glass" Background Effect */}
              <div className="from-primary/5 pointer-events-none absolute inset-0 bg-linear-to-r to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative mx-auto flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-sm sm:mx-0">
                {bgLoading ? (
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                ) : displayImage ? (
                  <img
                    alt={displayName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={displayImage}
                  />
                ) : (
                  <Music className="text-muted-foreground h-8 w-8" />
                )}
              </div>

              <div className="z-10 w-full min-w-0 flex-1 text-center sm:w-auto sm:text-left">
                <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:items-baseline sm:justify-start sm:gap-2">
                  <h4 className="truncate text-base leading-tight font-bold tracking-tight">
                    {displayName}
                  </h4>
                  {bgMetrics?.description && (
                    <span className="text-muted-foreground bg-background/50 hidden rounded-full border px-1.5 py-0.5 text-[10px] tracking-wider uppercase sm:inline-block">
                      Original
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1.5 truncate text-sm sm:justify-start">
                  {bgLoading ? (
                    <span className="bg-muted/50 h-3 w-20 animate-pulse rounded" />
                  ) : (
                    <span className="font-medium">by {displayOwner}</span>
                  )}
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs opacity-80">
                    {bgMetrics?.followers !== undefined
                      ? `${bgMetrics.followers.toLocaleString()} likes`
                      : 'Spotify Playlist'}
                  </span>
                </p>
              </div>

              <div className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto">
                <Button
                  className="hover:bg-destructive/10 hover:text-destructive z-10 h-8 w-8 shrink-0 rounded-full transition-colors"
                  onClick={() => {
                    setValue('id', '');
                    setValue('name', '');
                    setValue('imageUrl', undefined);
                    setValue('ownerId', '');
                    setValue('settings.description', '');
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {errors.id && <p className="text-destructive text-sm font-medium">{errors.id.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <LabelWithTooltip
            htmlFor="description"
            tooltip="This description is synced from Spotify. It cannot be edited here."
          >
            Description (Read-Only)
          </LabelWithTooltip>
          <Textarea
            id="description"
            {...register('settings.description')}
            className="bg-muted min-h-[80px] cursor-not-allowed resize-none"
            placeholder="A brief description for the playlist cover."
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
        <div className="bg-card hover:bg-accent/5 flex items-center justify-between rounded-xl border p-4 transition-colors sm:p-5">
          <div className="space-y-0.5">
            <LabelWithTooltip
              className="cursor-pointer text-base font-medium"
              htmlFor="enabled-mode"
              tooltip="Turn this on to let the system automatically manage this playlist in the background."
            >
              Enable Automation
            </LabelWithTooltip>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Allow the AI to update this playlist.
            </p>
          </div>
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch checked={field.value} id="enabled-mode" onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
