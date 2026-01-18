import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface AiSettingsProps {
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

export const AiSettings = ({ register, errors, watch }: AiSettingsProps) => {
  const playlistName = watch('name');
  const playlistDescription = watch('settings.description');
  const isInstrumental = watch('aiGeneration.isInstrumentalOnly');

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>AI Configuration</CardTitle>
        <CardDescription>Tell the AI how to curate your playlist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-Generated Prompt Preview */}
        <div className="space-y-2">
          <Label htmlFor="prompt-preview">Auto-Generated Prompt (Read-Only)</Label>
          <Textarea
            id="prompt-preview"
            value={generatePromptPreview(playlistName, playlistDescription, isInstrumental)}
            readOnly
            className="min-h-[120px] font-mono text-sm bg-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Prompts are auto-generated from playlist name and description to prevent injection
            attacks.
          </p>
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
