import { zodResolver } from '@hookform/resolvers/zod';
import { PlaylistConfig, PlaylistConfigSchema } from '@smart-spotify-curator/shared';
import { Save, Loader2 } from 'lucide-react';
import { useForm, Resolver, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { FunctionsService } from '../services/functions-service';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BasicSettings } from './config/BasicSettings';
import { AiSettings } from './config/AiSettings';
import { RulesSettings } from './config/RulesSettings';
import { TrackListSettings } from './config/TrackListSettings';
import { DEFAULT_PLAYLIST_CONFIG } from '@/constants/defaults';

interface ConfigEditorProps {
  initialConfig?: PlaylistConfig;
  onSubmit: (data: PlaylistConfig) => Promise<void>;
}

export const ConfigEditor = ({ initialConfig, onSubmit }: ConfigEditorProps) => {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<PlaylistConfig>({
    resolver: zodResolver(PlaylistConfigSchema) as Resolver<PlaylistConfig>,
    defaultValues: initialConfig || (DEFAULT_PLAYLIST_CONFIG as PlaylistConfig)
  });

  const onFormSubmit = async (data: PlaylistConfig) => {
    await onSubmit(data);
  };

  // --- Playlist Meta Sync Logic ---

  const playlistId = useWatch({ control, name: 'id' });
  const playlistName = useWatch({ control, name: 'name' });

  // Fetch playlist meta if we have ID but no name (e.g. initial load logic if name missing)
  const shouldFetchPlaylist =
    !!playlistId && playlistId.startsWith('spotify:playlist:') && !playlistName;

  const { data: fetchedPlaylist } = useQuery({
    queryKey: ['spotify', 'playlist', playlistId],
    queryFn: async () => {
      if (!playlistId) return null;
      const results = await FunctionsService.searchSpotify(playlistId, 'playlist');
      return results && results.length > 0 ? results[0] : null;
    },
    enabled: shouldFetchPlaylist,
    staleTime: 1000 * 60 * 30 // 30 mins
  });

  // Basic one-way sync
  useEffect(() => {
    if (fetchedPlaylist && !getValues('name')) {
      setValue('name', fetchedPlaylist.name);
    }
  }, [fetchedPlaylist, getValues, setValue]);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="max-w-4xl mx-auto pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Basic Info & Rules */}
        <div className="space-y-6">
          <BasicSettings
            control={control}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
          />
          <RulesSettings control={control} register={register} errors={errors} />
        </div>

        {/* Right Column: AI Config */}
        <div className="space-y-6">
          <AiSettings register={register} errors={errors} watch={watch} />
        </div>
      </div>

      {/* Full Width: Track List */}
      <div className="mt-6">
        <TrackListSettings
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
        />
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-10">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button type="submit" disabled={isSubmitting} size="lg" className="shadow-lg">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>
    </form>
  );
};
