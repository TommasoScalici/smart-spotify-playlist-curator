import { UseFormRegister, FieldErrors, UseFormWatch, Control, Controller } from 'react-hook-form';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sparkles, RefreshCw, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AiSettingsProps {
  control: Control<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
  watch: UseFormWatch<PlaylistConfig>;
}

// Simple stop words filter (mirrors backend logic)
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'playlist',
  'music',
  'songs',
  'tracks'
]);

function generatePromptPreview(
  name?: string,
  description?: string,
  isInstrumental?: boolean
): string {
  if (!name) return '(Prompt will be auto-generated from playlist name and description)';

  const titleWords = name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  let prompt = `Generate a curated playlist for "${name}".`;

  if (description) {
    prompt += `\n\nPlaylist Description: ${description}`;
  }

  if (titleWords.length > 0) {
    prompt += `\n\nStyle keywords from title: ${titleWords.join(', ')}.`;
    prompt += '\nUse these keywords to guide the mood, genre, and vibe of your suggestions.';
  }

  if (isInstrumental) {
    prompt += '\n\n**IMPORTANT**: Only suggest instrumental tracks (no vocals).';
  }

  prompt += '\n\nSuggest tracks that match this vibe perfectly.';

  return prompt;
}

export const AiSettings = ({ control, register, watch, errors }: AiSettingsProps) => {
  const playlistName = watch('name');
  const playlistDescription = watch('settings.description');
  const isInstrumental = watch('aiGeneration.isInstrumentalOnly');
  const isAiEnabled = watch('aiGeneration.enabled');

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Configuration
        </CardTitle>
        <CardDescription>Let AI suggest new tracks for your playlist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle: Enable AI */}
        <div className="flex items-center justify-between p-4 border rounded-md bg-accent/10">
          <div className="space-y-0.5">
            <Label htmlFor="ai-enabled" className="text-base font-medium">
              Enable AI Suggestions
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow AI to add new tracks during automation.
            </p>
          </div>
          <Controller
            control={control}
            name="aiGeneration.enabled"
            render={({ field }) => (
              <Switch id="ai-enabled" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Conditional: Show AI settings only if enabled */}
        {isAiEnabled && (
          <>
            {/* Tracks to Add */}
            <div className="space-y-2">
              <Label
                htmlFor="tracksToAdd"
                className={cn(errors.aiGeneration?.tracksToAdd && 'text-destructive')}
              >
                Number of AI Tracks to Add
              </Label>
              <Input
                id="tracksToAdd"
                type="number"
                min="0"
                max="50"
                {...register('aiGeneration.tracksToAdd', { valueAsNumber: true })}
                className={cn(
                  'max-w-[150px]',
                  errors.aiGeneration?.tracksToAdd && 'border-destructive'
                )}
              />
              <p className="text-xs text-muted-foreground">
                How many new tracks should the AI add during each automation run? (0-50)
              </p>
              {errors.aiGeneration?.tracksToAdd && (
                <p className="text-sm text-destructive font-medium">
                  {errors.aiGeneration.tracksToAdd.message}
                </p>
              )}
            </div>

            {/* Auto-Generated Prompt Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt-preview">Auto-Generated Prompt (Read-Only)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info('Prompt regenerated based on latest metadata.', {
                      description: 'This is a preview of the logic that runs automatically on save.'
                    });
                  }}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Regenerate
                </Button>
              </div>
              <Textarea
                id="prompt-preview"
                value={generatePromptPreview(playlistName, playlistDescription, isInstrumental)}
                readOnly
                className="min-h-[100px] font-mono text-sm bg-muted cursor-not-allowed resize-none"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Prompts are auto-generated from playlist name and description.
              </p>
            </div>

            {/* Advanced Settings (Collapsible in future, for now inline) */}
            <div className="pt-4 border-t">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-4 block">
                Advanced Settings
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Input
                    id="model"
                    {...register('aiGeneration.model')}
                    disabled
                    className="bg-muted"
                  />
                </div>
                {/* Temperature */}
                <div className="space-y-2">
                  <Label
                    htmlFor="temperature"
                    className={cn(errors.aiGeneration?.temperature && 'text-destructive')}
                  >
                    Temperature
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    {...register('aiGeneration.temperature', { valueAsNumber: true })}
                    className={cn(errors.aiGeneration?.temperature && 'border-destructive')}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
