import { Control, Controller, UseFormRegister, FieldErrors } from 'react-hook-form';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

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
            <Label htmlFor="maxTrackAgeDays">Max Track Age (Days)</Label>
            <Input
              id="maxTrackAgeDays"
              type="number"
              min="1"
              {...register('curationRules.maxTrackAgeDays', { valueAsNumber: true })}
            />
            {errors.curationRules?.maxTrackAgeDays && (
              <p className="text-sm text-destructive">
                {errors.curationRules.maxTrackAgeDays.message}
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
        </div>
      </CardContent>
    </Card>
  );
};
