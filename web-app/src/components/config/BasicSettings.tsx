import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch
} from 'react-hook-form';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SpotifySearch } from '../SpotifySearch';
import { Music, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BasicSettingsProps {
  control: Control<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  watch: UseFormWatch<PlaylistConfig>;
  errors: FieldErrors<PlaylistConfig>;
}

export const BasicSettings = ({
  control,
  register,
  setValue,
  watch,
  errors
}: BasicSettingsProps) => {
  const playlistId = watch('id');
  const playlistName = watch('name');
  const imageUrl = watch('imageUrl');

  // Note: Parent component handles the metadata state logic (playlistMeta),
  // but for a pure refactor we might want to pass display props or move that logic here.
  // For now, let's assume we can get basic info from the form or we might need to duplicate the
  // "fetch on load" logic or pass it down.
  // To keep it clean, let's try to just use what's in the form or rely on the Search component to populate it.

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Basic Settings</CardTitle>
        <CardDescription>Configure the target playlist and basic details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Playlist Selection */}
        <div className="space-y-2">
          <Label>Target Playlist</Label>
          {!playlistId ? (
            <Controller
              control={control}
              name="id"
              render={({ field }) => (
                <SpotifySearch
                  type="playlist"
                  placeholder="Select a playlist to curate..."
                  onSelect={(result) => {
                    field.onChange(result.uri);
                    setValue('name', result.name);
                    setValue('imageUrl', result.imageUrl);
                    // We set the description if it's new
                    if (result.owner) {
                      const currentDesc = watch('settings.description');
                      if (!currentDesc) {
                        setValue(
                          'settings.description',
                          `Curated version of ${result.name} by ${result.owner}`
                        );
                      }
                    }
                  }}
                />
              )}
            />
          ) : (
            <div className="flex items-center gap-4 p-4 border rounded-md bg-accent/20">
              <div className="h-16 w-16 bg-black/40 rounded overflow-hidden flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                {imageUrl ? (
                  <img src={imageUrl} alt={playlistName} className="h-full w-full object-cover" />
                ) : (
                  <Music className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold truncate">{playlistName || playlistId}</h4>
                <p className="text-sm text-muted-foreground truncate">{playlistId}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setValue('id', '');
                  setValue('name', '');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {errors.id && <p className="text-sm text-destructive">{errors.id.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('settings.description')}
            placeholder="A brief description for the playlist cover."
            className="min-h-[80px]"
          />
          {errors.settings?.description && (
            <p className="text-sm text-destructive">{errors.settings.description.message}</p>
          )}
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-md">
          <div className="space-y-0.5">
            <Label htmlFor="enabled-mode" className="text-base">
              Enable Automation
            </Label>
            <p className="text-sm text-muted-foreground">Allow the AI to update this playlist.</p>
          </div>
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch id="enabled-mode" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
