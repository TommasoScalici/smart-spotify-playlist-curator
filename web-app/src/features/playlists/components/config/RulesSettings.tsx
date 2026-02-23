import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { ChevronDown } from 'lucide-react';
import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LabelWithTooltip } from '@/components/ui/label-with-tooltip';
import { NumberInput } from '@/components/ui/number-input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface RulesSettingsProps {
  control: Control<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
}

export const RulesSettings = ({ control, errors }: RulesSettingsProps) => {
  return (
    <Card className="sm:bg-card mb-6 border-0 bg-transparent shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-0 sm:px-6">
        <CardTitle>Curation Rules</CardTitle>
        <CardDescription>Define constraints for the automated curator.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0 sm:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Max Age */}
          <div className="space-y-2">
            <LabelWithTooltip
              className={cn(errors.curationRules?.maxTrackAgeDays && 'text-destructive')}
              htmlFor="maxTrackAgeDays"
              tooltip="Tracks older than this number of days will be automatically removed from the playlist."
            >
              Max Track Age (Days)
            </LabelWithTooltip>
            <Controller
              control={control}
              name="curationRules.maxTrackAgeDays"
              render={({ field }) => (
                <NumberInput
                  className={cn(errors.curationRules?.maxTrackAgeDays && 'border-destructive')}
                  id="maxTrackAgeDays"
                  max={3650}
                  min={1}
                  onChange={field.onChange}
                  value={field.value || 0}
                />
              )}
            />
            {errors.curationRules?.maxTrackAgeDays && (
              <p className="text-destructive text-sm font-medium">
                {errors.curationRules.maxTrackAgeDays.message}
              </p>
            )}
          </div>

          {/* Target Track Count */}
          <div className="space-y-2">
            <LabelWithTooltip
              className={cn(errors.settings?.targetTotalTracks && 'text-destructive')}
              htmlFor="targetTotalTracks"
              tooltip="The target number of tracks for your playlist. We will try to keep the playlist near this size."
            >
              Target Track Count
            </LabelWithTooltip>
            <Controller
              control={control}
              name="settings.targetTotalTracks"
              render={({ field }) => (
                <NumberInput
                  className={cn(errors.settings?.targetTotalTracks && 'border-destructive')}
                  id="targetTotalTracks"
                  max={300}
                  min={5}
                  onChange={field.onChange}
                  step={5}
                  value={field.value || 0}
                />
              )}
            />
            {errors.settings?.targetTotalTracks && (
              <p className="text-destructive text-sm font-medium">
                {errors.settings.targetTotalTracks.message}
              </p>
            )}
          </div>

          {/* Max Tracks Per Artist */}
          <div className="space-y-2">
            <LabelWithTooltip
              className={cn(errors.curationRules?.maxTracksPerArtist && 'text-destructive')}
              htmlFor="maxTracksPerArtist"
              tooltip="Limit the number of songs from a single artist to ensure variety."
            >
              Max Tracks Per Artist
            </LabelWithTooltip>
            <Controller
              control={control}
              name="curationRules.maxTracksPerArtist"
              render={({ field }) => (
                <NumberInput
                  className={cn(errors.curationRules?.maxTracksPerArtist && 'border-destructive')}
                  id="maxTracksPerArtist"
                  max={20}
                  min={1}
                  onChange={field.onChange}
                  value={field.value || 0}
                />
              )}
            />
            {errors.curationRules?.maxTracksPerArtist && (
              <p className="text-destructive text-sm font-medium">
                {errors.curationRules.maxTracksPerArtist.message}
              </p>
            )}
          </div>

          {/* Remove Duplicates */}
          <div className="bg-card hover:bg-accent/5 flex items-center justify-between rounded-xl border p-4 transition-colors sm:p-5">
            <div className="space-y-1">
              <LabelWithTooltip
                className="cursor-pointer text-base font-medium"
                htmlFor="dedup-check"
                tooltip="Automatically identify and remove duplicate tracks based on ISRC codes and metadata."
              >
                Remove Duplicates
              </LabelWithTooltip>
              <p className="text-muted-foreground text-xs">Ensure only unique songs.</p>
            </div>
            <Controller
              control={control}
              name="curationRules.removeDuplicates"
              render={({ field }) => (
                <Switch checked={field.value} id="dedup-check" onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {/* Shuffle At End */}
          <div className="bg-card hover:bg-accent/5 flex items-center justify-between rounded-xl border p-4 transition-colors sm:p-5">
            <div className="space-y-1">
              <LabelWithTooltip
                className="cursor-pointer text-base font-medium"
                htmlFor="shuffle-check"
                tooltip="Randomize the order of tracks in the final playlist. Mandatory tracks will stay in their fixed positions."
              >
                Shuffle Playlist
              </LabelWithTooltip>
              <p className="text-muted-foreground text-xs">Randomize order vs keep original.</p>
            </div>
            <Controller
              control={control}
              name="curationRules.shuffleAtEnd"
              render={({ field }) => (
                <Switch checked={field.value} id="shuffle-check" onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {/* Size Limit Strategy */}
          <div className="space-y-2 pt-4 md:col-span-2">
            <LabelWithTooltip
              className="text-base font-semibold"
              htmlFor="sizeLimitStrategy"
              tooltip="Decide which tracks to remove first when the playlist exceeds the target size. Mandatory tracks are always preserved."
            >
              Size Limit Strategy
            </LabelWithTooltip>
            <div className="relative">
              <Controller
                control={control}
                name="curationRules.sizeLimitStrategy"
                render={({ field }) => (
                  <select
                    className="border-input bg-background/50 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring hover:bg-accent/5 flex h-11 w-full appearance-none rounded-md border px-3 py-2 pr-10 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:scheme-dark"
                    id="sizeLimitStrategy"
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
              <ChevronDown className="pointer-events-none absolute top-3 right-3 h-5 w-5 opacity-50" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
