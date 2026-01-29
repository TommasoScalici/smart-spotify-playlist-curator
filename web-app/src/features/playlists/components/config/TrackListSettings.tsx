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
      <TableCell className="w-[50px] font-medium text-muted-foreground">
        <div className="flex items-center justify-center">
          <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-50 cursor-grab" />
        </div>
      </TableCell>

      {/* Track Info */}
      <TableCell className="min-w-[300px]">
        {!trackValue.uri ? (
          <div className="w-full max-w-sm">
            <div
              className={cn(
                'transition-all',
                trackErrors?.uri && 'ring-1 ring-destructive rounded-md'
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
              <p className="text-xs text-destructive mt-1 font-medium">{trackErrors.uri.message}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Image */}
            <div className="h-10 w-10 bg-muted rounded overflow-hidden flex items-center justify-center shrink-0 border border-white/5">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : displayMeta.imageUrl ? (
                <img src={displayMeta.imageUrl} alt="Art" className="w-full h-full object-cover" />
              ) : (
                <Music className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-col justify-center min-w-0">
              <p className="font-medium text-sm truncate leading-tight">{displayMeta.name}</p>
              {displayMeta.artist && (
                <p className="text-xs text-muted-foreground truncate">{displayMeta.artist}</p>
              )}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="p-0 h-auto text-[10px] text-primary hover:underline text-left w-fit opacity-0 group-hover:opacity-100 transition-opacity"
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
            <p className="text-[10px] text-destructive font-medium leading-none mt-1">
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
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
          <p className="text-[11px] font-medium text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded px-2 py-1 mt-2 inline-block">
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
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Music className="h-6 w-6 opacity-50" />
            </div>
            <h3 className="text-lg font-medium">No tracks pinned</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
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
          <div className="rounded-md border overflow-hidden">
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
