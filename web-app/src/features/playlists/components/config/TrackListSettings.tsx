import {
  Control,
  useFieldArray,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
  useWatch
} from 'react-hook-form';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Music, Loader2 } from 'lucide-react';
import { SpotifySearch } from '@/features/spotify/components/SpotifySearch';
import { useQuery } from '@tanstack/react-query';
import { FunctionsService } from '@/services/functions-service';

interface TrackListSettingsProps {
  control: Control<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
}

interface TrackRowProps {
  index: number;
  control: Control<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  remove: (index: number) => void;
  errors: FieldErrors<PlaylistConfig>;
}

// Internal TrackRow Component
const TrackRow = ({ index, control, register, setValue, remove, errors }: TrackRowProps) => {
  const trackValue = useWatch({
    control,
    name: `mandatoryTracks.${index}`
  });

  const shouldFetch =
    !!trackValue.uri && trackValue.uri.startsWith('spotify:track:') && !trackValue.name;

  const { data: fetchedData, isLoading: loading } = useQuery({
    queryKey: ['spotify', 'track', trackValue.uri],
    queryFn: async () => {
      if (!trackValue.uri) return null;
      const results = await FunctionsService.searchSpotify(trackValue.uri, 'track');
      return results && results.length > 0 ? results[0] : null;
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
    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[40px_3fr_1fr_1fr_auto] gap-3 items-center p-3 mb-3 bg-accent/10 rounded-lg border border-border/50">
      {/* Mobile: Row 1 - Image + Meta (Span full) */}
      {/* Desktop: Col 1 & 2 */}

      {!trackValue.uri ? (
        <div className="col-span-full md:col-span-2">
          <SpotifySearch
            type="track"
            placeholder="Search track..."
            onSelect={(result) => {
              setValue(`mandatoryTracks.${index}.uri`, result.uri);
              setValue(`mandatoryTracks.${index}.name`, result.name);
              if (result.artist) setValue(`mandatoryTracks.${index}.artist`, result.artist);
              if (result.imageUrl) setValue(`mandatoryTracks.${index}.imageUrl`, result.imageUrl);
            }}
          />
          {errors.mandatoryTracks?.[index]?.uri && (
            <p className="text-xs text-destructive mt-1">Required</p>
          )}
        </div>
      ) : (
        <>
          {/* Image */}
          <div className="h-10 w-10 bg-muted rounded overflow-hidden items-center justify-center shrink-0 hidden md:flex">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : displayMeta.imageUrl ? (
              <img src={displayMeta.imageUrl} alt="Art" className="w-full h-full object-cover" />
            ) : (
              <Music className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-col justify-center min-w-0 col-span-1 md:col-auto">
            <p className="font-medium text-sm truncate">{displayMeta.name}</p>
            {displayMeta.artist && (
              <p className="text-xs text-muted-foreground truncate">{displayMeta.artist}</p>
            )}
            <button
              type="button"
              onClick={() => {
                // Clear fields to show search again
                setValue(`mandatoryTracks.${index}.uri`, '');
              }}
              className="text-[10px] text-primary hover:underline text-left mt-0.5 w-fit"
            >
              Change
            </button>
          </div>
        </>
      )}

      {/* Min Pos */}
      <div className="col-span-1 md:col-auto">
        <Label htmlFor={`min-${index}`} className="sr-only">
          Min Position
        </Label>
        <Input
          id={`min-${index}`}
          type="number"
          placeholder="Min"
          className="h-9 px-2 text-center"
          {...register(`mandatoryTracks.${index}.positionRange.min`, { valueAsNumber: true })}
        />
      </div>

      {/* Max Pos */}
      <div className="col-span-1 md:col-auto">
        <Label htmlFor={`max-${index}`} className="sr-only">
          Max Position
        </Label>
        <Input
          id={`max-${index}`}
          type="number"
          placeholder="Max"
          className="h-9 px-2 text-center "
          {...register(`mandatoryTracks.${index}.positionRange.max`, { valueAsNumber: true })}
        />
      </div>

      {/* Delete */}
      <div className="flex justify-end col-span-1 md:col-auto">
        <Button
          variant="destructive"
          size="icon"
          className="h-9 w-9 opacity-80 hover:opacity-100"
          onClick={() => remove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const TrackListSettings = ({
  control,
  register,
  setValue,
  errors
}: TrackListSettingsProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'mandatoryTracks'
  });

  return (
    <Card className="mb-20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Mandatory Tracks</CardTitle>
          <CardDescription>Songs that must be included in specific positions.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-primary border-primary/50 hover:bg-primary/10"
          onClick={() => append({ uri: '', positionRange: { min: 1, max: 1 } })}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Track
        </Button>
      </CardHeader>

      <CardContent>
        {fields.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            <Music className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No mandatory tracks configured.</p>
            <p className="text-sm">Click "Add Track" to pin a song.</p>
          </div>
        )}

        {fields.length > 0 && (
          <div className="space-y-1">
            {/* Header Row (Desktop only) */}
            <div className="hidden md:grid grid-cols-[40px_3fr_1fr_1fr_auto] gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <div></div>
              <div>Track Info</div>
              <div className="text-center">Min Pos</div>
              <div className="text-center">Max Pos</div>
              <div></div>
            </div>

            {fields.map((field, index) => (
              <TrackRow
                key={field.id}
                index={index}
                control={control}
                register={register}
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
