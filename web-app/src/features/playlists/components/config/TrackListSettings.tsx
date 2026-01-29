import { useQuery } from '@tanstack/react-query';
import { GripVertical, Loader2, Music, Plus, Trash2 } from 'lucide-react';
import {
  Control,
  FieldErrors,
  useFieldArray,
  UseFormRegister,
  UseFormSetValue,
  useWatch
} from 'react-hook-form';

import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { SpotifySearch } from '@/features/spotify/components/SpotifySearch';
import { cn } from '@/lib/utils';
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

  const trackErrors = errors.mandatoryTracks?.[index];

  const shouldFetch =
    !!trackValue.uri && trackValue.uri.startsWith('spotify:track:') && !trackValue.name;

  const { data: fetchedData, isLoading: loading } = useQuery({
    queryKey: ['spotify', 'track', trackValue.uri],
    queryFn: async () => {
      if (!trackValue.uri) return null;
      // Use getTrackDetails to fetch track metadata by URI directly
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
    <TableRow className="group">
      {/* Handle / Index */}
      <TableCell className="text-muted-foreground w-[50px] font-medium">
        <div className="flex items-center justify-center">
          <GripVertical className="h-4 w-4 cursor-grab opacity-0 group-hover:opacity-50" />
        </div>
      </TableCell>

      {/* Track Info */}
      <TableCell className="min-w-[300px]">
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
          <div className="flex items-center gap-3">
            {/* Image */}
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-white/5">
              {loading ? (
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              ) : displayMeta.imageUrl ? (
                <img src={displayMeta.imageUrl} alt="Art" className="h-full w-full object-cover" />
              ) : (
                <Music className="text-muted-foreground h-4 w-4" />
              )}
            </div>

            {/* Meta */}
            <div className="flex min-w-0 flex-col justify-center">
              <p className="truncate text-sm leading-tight font-medium">{displayMeta.name}</p>
              {displayMeta.artist && (
                <p className="text-muted-foreground truncate text-xs">{displayMeta.artist}</p>
              )}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-primary h-auto w-fit p-0 text-left text-[10px] opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
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
      </TableCell>

      {/* Logic: Min/Max Position */}
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label htmlFor={`min-${index}`} className="sr-only">
                Min
              </Label>
              <Input
                id={`min-${index}`}
                type="number"
                placeholder="Min"
                onWheel={(e) => e.currentTarget.blur()}
                className={cn(
                  'h-8 w-16 px-2 text-center',
                  trackErrors?.positionRange?.min && 'border-destructive'
                )}
                {...register(`mandatoryTracks.${index}.positionRange.min`, { valueAsNumber: true })}
              />
            </div>
            <span className="text-muted-foreground text-xs">-</span>
            <div className="space-y-1">
              <Label htmlFor={`max-${index}`} className="sr-only">
                Max
              </Label>
              <Input
                id={`max-${index}`}
                type="number"
                placeholder="Max"
                onWheel={(e) => e.currentTarget.blur()}
                className={cn(
                  'h-8 w-16 px-2 text-center',
                  trackErrors?.positionRange?.max && 'border-destructive'
                )}
                {...register(`mandatoryTracks.${index}.positionRange.max`, { valueAsNumber: true })}
              />
            </div>
          </div>
          {(trackErrors?.positionRange?.min || trackErrors?.positionRange?.max) && (
            <p className="text-destructive mt-1 text-[10px] leading-none font-medium">
              {trackErrors.positionRange?.min?.message || trackErrors.positionRange?.max?.message}
            </p>
          )}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          onClick={() => remove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
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
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Mandatory Tracks</CardTitle>
          <CardDescription>
            Pin specific songs to exact positions (e.g., Opener, Closer).
          </CardDescription>
          <p className="mt-2 inline-block rounded border border-amber-500/10 bg-amber-500/5 px-2 py-1 text-[11px] font-medium text-amber-500/80">
            Note: Pinned tracks always stay in the playlist and bypass age & artist limits.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => append({ uri: '', positionRange: { min: 1, max: 1 } })}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Track
        </Button>
      </CardHeader>

      <CardContent>
        {fields.length === 0 ? (
          <div className="bg-muted/10 rounded-lg border-2 border-dashed py-12 text-center">
            <div className="bg-muted/50 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Music className="h-6 w-6 opacity-50" />
            </div>
            <h3 className="text-lg font-medium">No tracks pinned</h3>
            <p className="text-muted-foreground mx-auto mt-1 mb-4 max-w-sm text-sm">
              Add specific songs you want to guarantee appear in your playlist, regardless of AI
              suggestions.
            </p>
            <Button
              variant="outline"
              onClick={() => append({ uri: '', positionRange: { min: 1, max: 1 } })}
            >
              Add Your First Track
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Track Details</TableHead>
                  <TableHead>Position Range (Min - Max)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
