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

import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LabelWithTooltip } from '@/components/ui/label-with-tooltip';
import { NumberInput } from '@/components/ui/number-input';
import { SpotifySearch } from '@/features/spotify/components/SpotifySearch';
import { cn } from '@/lib/utils';
import { FunctionsService } from '@/services/functions-service';

interface TrackListSettingsProps {
  control: Control<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
}

interface TrackRowProps {
  index: number;
  control: Control<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  remove: (index: number) => void;
  errors: FieldErrors<PlaylistConfig>;
}

// Internal TrackRow Component
// ... (TrackRow component start)
const TrackRow = ({ index, control, setValue, remove, errors }: TrackRowProps) => {
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
    queryKey: ['spotify', 'track', trackValue.uri],
    queryFn: async () => {
      if (!trackValue.uri) return null;
      return await FunctionsService.getTrackDetails(trackValue.uri);
    },
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 60
  });

  const displayMeta = {
    name: trackValue.name || fetchedData?.name || trackValue.uri,
    artist: trackValue.artist || fetchedData?.artist,
    imageUrl: trackValue.imageUrl || fetchedData?.imageUrl
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
                type="track"
                placeholder="Search track to pin..."
                onSelect={(result) => {
                  setValue(`mandatoryTracks.${index}.uri`, result.uri, { shouldValidate: true });
                  setValue(`mandatoryTracks.${index}.name`, result.name);
                  if (result.artist) setValue(`mandatoryTracks.${index}.artist`, result.artist);
                  if (result.imageUrl)
                    setValue(`mandatoryTracks.${index}.imageUrl`, result.imageUrl);
                }}
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
                <img src={displayMeta.imageUrl} alt="Art" className="h-full w-full object-cover" />
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
                type="button"
                variant="link"
                size="sm"
                className="text-primary h-auto w-fit p-0 text-left text-[10px] opacity-100 transition-opacity hover:underline sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => {
                  // Clear fields to show search again
                  setValue(`mandatoryTracks.${index}.uri`, '');
                }}
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
              htmlFor={`min-${index}`}
              tooltip="The earliest position this track can appear in the playlist (1 = Start)."
              className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
            >
              Min Pos
            </LabelWithTooltip>
            <Controller
              control={control}
              name={`mandatoryTracks.${index}.positionRange.min`}
              rules={{
                validate: (value) => {
                  if (value > (specificTrackRange?.max || 999)) return 'Min > Max';
                  if (value > targetTotalTracks) return 'Min > Total';
                  return true;
                }
              }}
              render={({ field }) => (
                <NumberInput
                  id={`min-${index}`}
                  min={1}
                  max={targetTotalTracks}
                  value={field.value || 0}
                  onChange={field.onChange}
                  className={cn('w-36', trackErrors?.positionRange?.min && 'border-destructive')}
                />
              )}
            />
          </div>
          <span className="text-muted-foreground mt-6 text-xs">-</span>
          <div className="space-y-1">
            <LabelWithTooltip
              htmlFor={`max-${index}`}
              tooltip="The latest position this track can appear in the playlist."
              className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
            >
              Max Pos
            </LabelWithTooltip>
            <Controller
              control={control}
              name={`mandatoryTracks.${index}.positionRange.max`}
              rules={{
                validate: (value) => {
                  if (value < (specificTrackRange?.min || 1)) return 'Max < Min';
                  if (value > targetTotalTracks) return 'Max > Total';
                  return true;
                }
              }}
              render={({ field }) => (
                <NumberInput
                  id={`max-${index}`}
                  min={1}
                  max={targetTotalTracks}
                  value={field.value || 0}
                  onChange={field.onChange}
                  className={cn('w-36', trackErrors?.positionRange?.max && 'border-destructive')}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          onClick={() => remove(index)}
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

export const TrackListSettings = ({ control, setValue, errors }: TrackListSettingsProps) => {
  const { fields, append, remove } = useFieldArray({
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
            variant="secondary"
            size="sm"
            onClick={() => append({ uri: '', positionRange: { min: 1, max: 1 } })}
            className="w-full sm:w-auto"
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
              variant="outline"
              onClick={() => append({ uri: '', positionRange: { min: 1, max: 1 } })}
            >
              Add Your First Track
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <TrackRow
                key={field.id}
                index={index}
                control={control}
                setValue={setValue}
                remove={remove}
                errors={errors}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
