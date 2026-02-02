import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Music, Plus, Trash2 } from 'lucide-react';
import {
  Control,
  Controller,
  FieldErrors,
  useFieldArray,
  UseFormSetValue,
  useWatch
} from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LabelWithTooltip } from '@/components/ui/label-with-tooltip';
import { NumberInput } from '@/components/ui/number-input';
import { SpotifySearch } from '@/features/spotify/components/SpotifySearch';
import { cn } from '@/lib/utils';
import { FunctionsService } from '@/services/functions-service';

interface TrackListSettingsProps {
  control: Control<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
}

interface TrackRowProps {
  control: Control<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
  index: number;
  remove: (index: number) => void;
  setValue: UseFormSetValue<PlaylistConfig>;
}

// Internal TrackRow Component
// ... (TrackRow component start)
const TrackRow = ({ control, errors, index, remove, setValue }: TrackRowProps) => {
  const trackValue = useWatch({
    control,
    name: `mandatoryTracks.${index}`
  });

  const trackErrors = errors.mandatoryTracks?.[index];

  const targetTotalTracks =
    useWatch({
      control,
      name: 'settings.targetTotalTracks'
    }) || 50; // Default fallback

  const specificTrackRange = useWatch({
    control,
    name: `mandatoryTracks.${index}.positionRange`
  });

  const shouldFetch =
    !!trackValue.uri && trackValue.uri.startsWith('spotify:track:') && !trackValue.name;

  const { data: fetchedData, isLoading: loading } = useQuery({
    enabled: shouldFetch,
    queryFn: async () => {
      if (!trackValue.uri) return null;
      return await FunctionsService.getTrackDetails(trackValue.uri);
    },
    queryKey: ['spotify', 'track', trackValue.uri],
    staleTime: 1000 * 60 * 60
  });

  const displayMeta = {
    artist: trackValue.artist || fetchedData?.artist,
    imageUrl: trackValue.imageUrl || fetchedData?.imageUrl,
    name: trackValue.name || fetchedData?.name || trackValue.uri
  };

  return (
    <div className="group bg-card/50 hover:bg-card hover:border-primary/20 relative flex flex-col gap-4 rounded-xl border p-4 transition-all sm:flex-row sm:items-center">
      {/* Drag Handle (Visual Only for now) & Index */}
      <div className="text-muted-foreground/50 absolute top-2 left-2 flex h-6 w-6 items-center justify-center sm:relative sm:top-0 sm:left-0">
        <span className="font-mono text-xs font-medium opacity-50">{index + 1}</span>
      </div>

      {/* Track Info */}
      <div className="min-w-0 flex-1">
        {!trackValue.uri ? (
          <div className="w-full max-w-sm">
            <div
              className={cn(
                'transition-all',
                trackErrors?.uri && 'ring-destructive rounded-md ring-1'
              )}
            >
              <SpotifySearch
                onSelect={(result) => {
                  setValue(`mandatoryTracks.${index}.uri`, result.uri, { shouldValidate: true });
                  setValue(`mandatoryTracks.${index}.name`, result.name);
                  if (result.artist) setValue(`mandatoryTracks.${index}.artist`, result.artist);
                  if (result.imageUrl)
                    setValue(`mandatoryTracks.${index}.imageUrl`, result.imageUrl);
                }}
                placeholder="Search track to pin..."
                type="track"
              />
            </div>
            {trackErrors?.uri && (
              <p className="text-destructive mt-1 text-xs font-medium">{trackErrors.uri.message}</p>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 sm:items-center">
            {/* Image */}
            <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/5 shadow-sm">
              {loading ? (
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              ) : displayMeta.imageUrl ? (
                <img alt="Art" className="h-full w-full object-cover" src={displayMeta.imageUrl} />
              ) : (
                <Music className="text-muted-foreground h-5 w-5" />
              )}
            </div>

            {/* Meta */}
            <div className="flex min-w-0 flex-col justify-center gap-0.5">
              <p className="text-foreground/90 truncate text-sm font-semibold">
                {displayMeta.name}
              </p>
              {displayMeta.artist && (
                <p className="text-muted-foreground truncate text-xs">{displayMeta.artist}</p>
              )}
              <Button
                className="text-primary h-auto w-fit p-0 text-left text-[10px] opacity-100 transition-opacity hover:underline sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => {
                  // Clear fields to show search again
                  setValue(`mandatoryTracks.${index}.uri`, '');
                }}
                size="sm"
                type="button"
                variant="link"
              >
                Change Track
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Logic: Min/Max Position */}
      <div className="border-border/50 mt-2 flex items-center gap-3 border-t pt-2 sm:mt-0 sm:border-t-0 sm:pt-0">
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <LabelWithTooltip
              className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
              htmlFor={`min-${index}`}
              tooltip="The earliest position this track can appear in the playlist (1 = Start)."
            >
              Min Pos
            </LabelWithTooltip>
            <Controller
              control={control}
              name={`mandatoryTracks.${index}.positionRange.min`}
              render={({ field }) => (
                <NumberInput
                  className={cn('w-36', trackErrors?.positionRange?.min && 'border-destructive')}
                  id={`min-${index}`}
                  max={targetTotalTracks}
                  min={1}
                  onChange={field.onChange}
                  value={field.value || 0}
                />
              )}
              rules={{
                validate: (value) => {
                  if (value > (specificTrackRange?.max || 999)) return 'Min > Max';
                  if (value > targetTotalTracks) return 'Min > Total';
                  return true;
                }
              }}
            />
          </div>
          <span className="text-muted-foreground mt-6 text-xs">-</span>
          <div className="space-y-1">
            <LabelWithTooltip
              className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
              htmlFor={`max-${index}`}
              tooltip="The latest position this track can appear in the playlist."
            >
              Max Pos
            </LabelWithTooltip>
            <Controller
              control={control}
              name={`mandatoryTracks.${index}.positionRange.max`}
              render={({ field }) => (
                <NumberInput
                  className={cn('w-36', trackErrors?.positionRange?.max && 'border-destructive')}
                  id={`max-${index}`}
                  max={targetTotalTracks}
                  min={1}
                  onChange={field.onChange}
                  value={field.value || 0}
                />
              )}
              rules={{
                validate: (value) => {
                  if (value < (specificTrackRange?.min || 1)) return 'Max < Min';
                  if (value > targetTotalTracks) return 'Max > Total';
                  return true;
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto">
        <Button
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          onClick={() => remove(index)}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {(trackErrors?.positionRange?.min || trackErrors?.positionRange?.max) && (
        <div className="basis-full text-center sm:text-right">
          <p className="text-destructive text-[10px] leading-none font-medium">
            {trackErrors.positionRange?.min?.message || trackErrors.positionRange?.max?.message}
          </p>
        </div>
      )}
    </div>
  );
};

export const TrackListSettings = ({ control, errors, setValue }: TrackListSettingsProps) => {
  const { append, fields, remove } = useFieldArray({
    control,
    name: 'mandatoryTracks'
  });

  return (
    <Card className="sm:bg-card mb-6 border-0 bg-transparent shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-0 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <CardTitle className="text-xl">Mandatory Tracks</CardTitle>
            <CardDescription>
              Pin specific songs to exact positions (e.g., Opener, Closer).
            </CardDescription>
            <p className="mt-2 inline-block rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-500">
              ⚡ Pinned tracks bypass all rules (Age, Artist Limits).
            </p>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => append({ positionRange: { max: 1, min: 1 }, uri: '' })}
            size="sm"
            variant="secondary"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Track
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0 sm:px-6">
        {fields.length === 0 ? (
          <div className="bg-muted/10 border-muted hover:bg-muted/20 rounded-xl border-2 border-dashed py-12 text-center transition-colors">
            <div className="bg-background mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full shadow-sm">
              <Music className="text-muted-foreground/50 h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium">No tracks pinned</h3>
            <p className="text-muted-foreground mx-auto mt-1 mb-4 max-w-sm text-sm">
              Add specific songs you want to guarantee appear in your playlist.
            </p>
            <Button
              onClick={() => append({ positionRange: { max: 1, min: 1 }, uri: '' })}
              variant="outline"
            >
              Add Your First Track
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <TrackRow
                control={control}
                errors={errors}
                index={index}
                key={field.id}
                remove={remove}
                setValue={setValue}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
