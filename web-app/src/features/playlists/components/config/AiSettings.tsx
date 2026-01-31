import { Bot, RefreshCw, Sparkles } from 'lucide-react';
import { Control, Controller, FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { PlaylistConfig, SearchResult } from '@smart-spotify-curator/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithTooltip } from '@/components/ui/label-with-tooltip';
import { NumberInput } from '@/components/ui/number-input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { ArtistSelector } from './ArtistSelector';

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
  isInstrumental?: boolean,
  referenceArtists?: SearchResult[]
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

  if (referenceArtists && referenceArtists.length > 0) {
    const artistNames = referenceArtists.map((a) => a.name).join(', ');
    prompt += `\n\nReference Artists: ${artistNames}`;
    prompt += '\nUse these artists to define the sonic profile and quality bar for suggestions.';
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
  const aiConfig = watch('aiGeneration');
  const referenceArtists = watch('settings.referenceArtists') || [];

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
        <div className="bg-card hover:bg-accent/5 flex items-center justify-between rounded-xl border p-4 transition-colors sm:p-5">
          <div className="space-y-0.5">
            <LabelWithTooltip
              tooltip="Allow the AI to analyze your playlist and suggest new tracks based on your criteria."
              htmlFor="ai-enabled"
              className="cursor-pointer text-base font-medium"
            >
              Enable AI Suggestions
            </LabelWithTooltip>
            {/* Kept p tag as it acts as a subtitle here */}
            <p className="text-muted-foreground text-xs sm:text-sm">
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
            {/* Reference Artists */}
            <div className="bg-primary/5 space-y-3 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary h-4 w-4" />
                <LabelWithTooltip
                  tooltip="Select artists that define the vibe of your playlist. The AI will use these to find similar music."
                  htmlFor="referenceArtists"
                  className="text-sm font-semibold"
                >
                  Reference Artists
                </LabelWithTooltip>
              </div>
              <Controller
                control={control}
                name="settings.referenceArtists"
                render={({ field }) => (
                  <ArtistSelector
                    value={field.value || []}
                    onChange={(artists) => field.onChange(artists)}
                    playlistName={playlistName}
                    description={playlistDescription}
                    aiConfig={aiConfig}
                  />
                )}
              />
            </div>

            {/* Tracks to Add */}
            <div className="space-y-2">
              <LabelWithTooltip
                htmlFor="tracksToAdd"
                tooltip="The number of new tracks the AI will attempt to add in each run."
                className={cn(errors.aiGeneration?.tracksToAdd && 'text-destructive')}
              >
                Number of AI Tracks to Add
              </LabelWithTooltip>
              <Controller
                control={control}
                name="aiGeneration.tracksToAdd"
                render={({ field }) => (
                  <NumberInput
                    id="tracksToAdd"
                    min={0}
                    max={50}
                    value={field.value || 0}
                    onChange={field.onChange}
                    className={cn(
                      'max-w-[150px]',
                      errors.aiGeneration?.tracksToAdd && 'border-destructive'
                    )}
                  />
                )}
              />
              {errors.aiGeneration?.tracksToAdd && (
                <p className="text-destructive text-sm font-medium">
                  {errors.aiGeneration.tracksToAdd.message}
                </p>
              )}
            </div>

            {/* Auto-Generated Prompt Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <LabelWithTooltip
                  tooltip="This prompt is generated from your settings and used to instruct the AI. Read-only."
                  htmlFor="prompt-preview"
                >
                  Auto-Generated Prompt (Read-Only)
                </LabelWithTooltip>
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
                value={generatePromptPreview(
                  playlistName,
                  playlistDescription,
                  isInstrumental,
                  referenceArtists
                )}
                readOnly
                className="bg-muted min-h-[120px] cursor-not-allowed resize-none font-mono text-sm"
              />
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                Prompts are auto-generated from playlist name, reference artists, and description.
              </p>
            </div>

            {/* Advanced Settings (Collapsible in future, for now inline) */}
            <div className="border-t pt-4">
              <Label className="text-muted-foreground mb-4 block text-xs tracking-wider uppercase">
                Advanced Settings
              </Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Model */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    htmlFor="model"
                    tooltip="The AI model used for generating suggestions. Currently fixed."
                  >
                    AI Model
                  </LabelWithTooltip>
                  <Input
                    id="model"
                    {...register('aiGeneration.model')}
                    disabled
                    className="bg-muted"
                  />
                </div>
                {/* Temperature */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    htmlFor="temperature"
                    tooltip="Controls the randomness of the AI. Lower values are more focused, higher values are more creative."
                    className={cn(errors.aiGeneration?.temperature && 'text-destructive')}
                  >
                    Temperature
                  </LabelWithTooltip>
                  <Controller
                    control={control}
                    name="aiGeneration.temperature"
                    render={({ field }) => (
                      <NumberInput
                        id="temperature"
                        step={0.1}
                        min={0}
                        max={1}
                        value={field.value || 0}
                        onChange={field.onChange}
                        className={cn(errors.aiGeneration?.temperature && 'border-destructive')}
                      />
                    )}
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
