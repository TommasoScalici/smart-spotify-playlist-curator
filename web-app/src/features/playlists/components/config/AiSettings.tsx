import { PlaylistConfig, SearchResult } from '@smart-spotify-curator/shared';
import { Bot, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Control, Controller, FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { toast } from 'sonner';

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
  errors: FieldErrors<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  watch: UseFormWatch<PlaylistConfig>;
}

// Simple stop words filter (mirrors backend logic)
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'music',
  'of',
  'on',
  'or',
  'playlist',
  'songs',
  'the',
  'to',
  'tracks',
  'with'
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

export const AiSettings = ({ control, errors, register, watch }: AiSettingsProps) => {
  const playlistName = watch('name');
  const playlistDescription = watch('settings.description');
  const isInstrumental = watch('aiGeneration.isInstrumentalOnly');
  const isAiEnabled = watch('aiGeneration.enabled');
  const aiConfig = watch('aiGeneration');
  const referenceArtists = watch('settings.referenceArtists') || [];

  const [promptPreview, setPromptPreview] = useState(() =>
    generatePromptPreview(playlistName, playlistDescription, isInstrumental, referenceArtists)
  );

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
              className="cursor-pointer text-base font-medium"
              htmlFor="ai-enabled"
              tooltip="Allow the AI to analyze your playlist and suggest new tracks based on your criteria."
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
              <Switch checked={field.value} id="ai-enabled" onCheckedChange={field.onChange} />
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
                  className="text-sm font-semibold"
                  htmlFor="referenceArtists"
                  tooltip="Select artists that define the vibe of your playlist. The AI will use these to find similar music."
                >
                  Reference Artists
                </LabelWithTooltip>
              </div>
              <Controller
                control={control}
                name="settings.referenceArtists"
                render={({ field }) => (
                  <ArtistSelector
                    aiConfig={aiConfig}
                    description={playlistDescription}
                    onChange={(artists) => field.onChange(artists)}
                    playlistName={playlistName}
                    value={field.value || []}
                  />
                )}
              />
            </div>

            {/* Tracks to Add */}
            <div className="space-y-2">
              <LabelWithTooltip
                className={cn(errors.aiGeneration?.tracksToAdd && 'text-destructive')}
                htmlFor="tracksToAdd"
                tooltip="The number of new tracks the AI will attempt to add in each run."
              >
                Number of AI Tracks to Add
              </LabelWithTooltip>
              <Controller
                control={control}
                name="aiGeneration.tracksToAdd"
                render={({ field }) => (
                  <NumberInput
                    className={cn(
                      'max-w-[150px]',
                      errors.aiGeneration?.tracksToAdd && 'border-destructive'
                    )}
                    id="tracksToAdd"
                    max={50}
                    min={0}
                    onChange={field.onChange}
                    value={field.value || 0}
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
                  htmlFor="prompt-preview"
                  tooltip="This prompt is generated from your settings and used to instruct the AI. Read-only."
                >
                  Auto-Generated Prompt (Read-Only)
                </LabelWithTooltip>
                <Button
                  className="h-7 text-xs"
                  onClick={() => {
                    setPromptPreview(
                      generatePromptPreview(
                        playlistName,
                        playlistDescription,
                        isInstrumental,
                        referenceArtists
                      )
                    );
                    toast.success('Prompt regenerated successfully.');
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Regenerate
                </Button>
              </div>
              <Textarea
                className="bg-muted min-h-[120px] cursor-not-allowed resize-none font-mono text-sm"
                id="prompt-preview"
                readOnly
                value={promptPreview}
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
                    className="bg-muted"
                    disabled
                  />
                </div>
                {/* Temperature */}
                <div className="space-y-2">
                  <LabelWithTooltip
                    className={cn(errors.aiGeneration?.temperature && 'text-destructive')}
                    htmlFor="temperature"
                    tooltip="Controls the randomness of the AI. Lower values are more focused, higher values are more creative."
                  >
                    Temperature
                  </LabelWithTooltip>
                  <Controller
                    control={control}
                    name="aiGeneration.temperature"
                    render={({ field }) => (
                      <NumberInput
                        className={cn(errors.aiGeneration?.temperature && 'border-destructive')}
                        id="temperature"
                        max={1}
                        min={0}
                        onChange={field.onChange}
                        step={0.1}
                        value={field.value || 0}
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
