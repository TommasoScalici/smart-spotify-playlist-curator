import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface AiSettingsProps {
  register: UseFormRegister<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
}

export const AiSettings = ({ register, errors }: AiSettingsProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>AI Configuration</CardTitle>
        <CardDescription>Tell the AI how to curate your playlist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Curation Prompt</Label>
          <Textarea
            id="prompt"
            {...register('aiGeneration.prompt')}
            placeholder="E.g. Create a playlist of upbeat 80s synthwave..."
            className="min-h-[120px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Be specific about mood, genre, tempo, and era.
          </p>
          {errors.aiGeneration?.prompt && (
            <p className="text-sm text-destructive">{errors.aiGeneration.prompt.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Tracks */}
          <div className="space-y-2">
            <Label htmlFor="targetTotalTracks">Target Track Count</Label>
            <Input
              id="targetTotalTracks"
              type="number"
              {...register('settings.targetTotalTracks', { valueAsNumber: true })}
            />
            {errors.settings?.targetTotalTracks && (
              <p className="text-sm text-destructive">
                {errors.settings.targetTotalTracks.message}
              </p>
            )}
          </div>

          {/* Model (Read Only for now) */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Input id="model" {...register('aiGeneration.model')} disabled className="bg-muted" />
          </div>
        </div>

        {/* Advanced AI Settings collapsible could go here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature (Creativity)</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="1"
              {...register('aiGeneration.temperature', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overfetchRatio">Overfetch Ratio</Label>
            <Input
              id="overfetchRatio"
              type="number"
              step="0.1"
              min="1"
              max="5"
              {...register('aiGeneration.overfetchRatio', { valueAsNumber: true })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
