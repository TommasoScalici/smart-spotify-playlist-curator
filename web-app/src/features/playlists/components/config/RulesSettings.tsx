import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form';

import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface RulesSettingsProps {
  control: Control<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
}

export const RulesSettings = ({ control, register, errors }: RulesSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Curation Rules</CardTitle>
        <CardDescription>Define constraints for the automated curator.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Max Age */}
          <div className="space-y-2">
            <Label
              htmlFor="maxTrackAgeDays"
              className={cn(errors.curationRules?.maxTrackAgeDays && 'text-destructive')}
            >
              Max Track Age (Days)
            </Label>
            <Input
              id="maxTrackAgeDays"
              type="number"
              min="1"
              onWheel={(e) => e.currentTarget.blur()}
              {...register('curationRules.maxTrackAgeDays', { valueAsNumber: true })}
              className={cn(errors.curationRules?.maxTrackAgeDays && 'border-destructive')}
            />
            {errors.curationRules?.maxTrackAgeDays && (
              <p className="text-sm text-destructive font-medium">
                {errors.curationRules.maxTrackAgeDays.message}
              </p>
            )}
          </div>

          {/* Target Track Count */}
          <div className="space-y-2">
            <Label
              htmlFor="targetTotalTracks"
              className={cn(errors.settings?.targetTotalTracks && 'text-destructive')}
            >
              Target Track Count
            </Label>
            <Input
              id="targetTotalTracks"
              type="number"
              min="5"
              max="999"
              onWheel={(e) => e.currentTarget.blur()}
              {...register('settings.targetTotalTracks', { valueAsNumber: true })}
              className={cn(errors.settings?.targetTotalTracks && 'border-destructive')}
            />
            {errors.settings?.targetTotalTracks && (
              <p className="text-sm text-destructive font-medium">
                {errors.settings.targetTotalTracks.message}
              </p>
            )}
          </div>

          {/* Max Tracks Per Artist */}
          <div className="space-y-2">
            <Label
              htmlFor="maxTracksPerArtist"
              className={cn(errors.curationRules?.maxTracksPerArtist && 'text-destructive')}
            >
              Max Tracks Per Artist
            </Label>
            <Input
              id="maxTracksPerArtist"
              type="number"
              min="1"
              max="10"
              onWheel={(e) => e.currentTarget.blur()}
              {...register('curationRules.maxTracksPerArtist', { valueAsNumber: true })}
              className={cn(errors.curationRules?.maxTracksPerArtist && 'border-destructive')}
            />
            <p className="text-xs text-muted-foreground">
              Limit how many songs from the same artist can be in the playlist.
            </p>
            {errors.curationRules?.maxTracksPerArtist && (
              <p className="text-sm text-destructive font-medium">
                {errors.curationRules.maxTracksPerArtist.message}
              </p>
            )}
          </div>

          {/* Remove Duplicates */}
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className="space-y-0.5">
              <Label htmlFor="dedup-check" className="text-base">
                Remove Duplicates
              </Label>
              <p className="text-xs text-muted-foreground">Ensure only unique songs.</p>
            </div>
            <Controller
              control={control}
              name="curationRules.removeDuplicates"
              render={({ field }) => (
                <Switch id="dedup-check" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {/* Shuffle At End */}
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className="space-y-0.5">
              <Label htmlFor="shuffle-check" className="text-base">
                Shuffle Playlist
              </Label>
              <p className="text-xs text-muted-foreground">Randomize order vs keep original.</p>
            </div>
            <Controller
              control={control}
              name="curationRules.shuffleAtEnd"
              render={({ field }) => (
                <Switch id="shuffle-check" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {/* Size Limit Strategy */}
          <div className="space-y-2 md:col-span-2 border-t pt-4">
            <Label htmlFor="sizeLimitStrategy" className="text-base font-semibold">
              Size Limit Strategy
            </Label>
            <Controller
              control={control}
              name="curationRules.sizeLimitStrategy"
              render={({ field }) => (
                <select
                  id="sizeLimitStrategy"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                >
                  <option value="drop_random">Drop Random (Default)</option>
                  <option value="drop_newest">Drop Newest (Keep Oldest)</option>
                  <option value="drop_oldest">Drop Oldest (Keep Newest)</option>
                  <option value="drop_most_popular">Drop Most Popular (Keep Niche)</option>
                  <option value="drop_least_popular">Drop Least Popular (Keep Hits)</option>
                </select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Define which tracks are removed when the playlist exceeds the target track count.
              Mandatory tracks are always preserved.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
