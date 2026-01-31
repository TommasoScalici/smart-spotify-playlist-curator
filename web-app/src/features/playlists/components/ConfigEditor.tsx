import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { FieldErrors, Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { PlaylistConfig, PlaylistConfigSchema } from '@smart-spotify-curator/shared';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DEFAULT_PLAYLIST_CONFIG } from '@/constants/defaults';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { FirestoreService } from '@/services/firestore-service';
import { FunctionsService } from '@/services/functions-service';

import { AiSettings } from './config/AiSettings';
import { BasicSettings } from './config/BasicSettings';
import { RulesSettings } from './config/RulesSettings';
import { TrackListSettings } from './config/TrackListSettings';

interface ConfigEditorProps {
  initialConfig?: PlaylistConfig;
  onSubmit: (data: PlaylistConfig) => Promise<void>;
  isAddMode?: boolean;
}

/**
 * Recursively counts all error messages in the form errors object.
 */
const countAllErrors = (obj: Record<string, unknown> | null | undefined): number => {
  let count = 0;
  if (!obj || typeof obj !== 'object') return 0;
  if ('message' in obj) return 1;
  for (const key in obj) {
    count += countAllErrors(obj[key] as Record<string, unknown>);
  }
  return count;
};

/**
 * Recursively extracts all error messages into a flat array.
 */
const getFlatErrorMessages = (obj: Record<string, unknown> | null | undefined): string[] => {
  const messages: string[] = [];
  const walk = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    if ('message' in record && typeof record.message === 'string') messages.push(record.message);
    else {
      for (const key in record) walk(record[key]);
    }
  };
  walk(obj);
  return messages;
};

export const ConfigEditor = ({ initialConfig, onSubmit, isAddMode }: ConfigEditorProps) => {
  const { user } = useAuth();

  // Fetch existing playlists to check for duplicates in Add mode
  const { data: existingPlaylists = [] } = useQuery({
    queryKey: ['playlists', user?.uid],
    queryFn: () => (user ? FirestoreService.getUserPlaylists(user.uid) : []),
    enabled: !!user && !!isAddMode
  });

  // Composite schema with duplicate check
  const validationSchema = PlaylistConfigSchema.superRefine((data, ctx) => {
    if (isAddMode && existingPlaylists.some((p: PlaylistConfig) => p.id === data.id)) {
      ctx.addIssue({
        code: 'custom',
        message: 'This playlist is already being curated by you',
        path: ['id']
      });
    }
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<PlaylistConfig>({
    resolver: zodResolver(validationSchema) as Resolver<PlaylistConfig>,
    defaultValues: initialConfig || (DEFAULT_PLAYLIST_CONFIG as PlaylistConfig)
  });

  const totalErrors = countAllErrors(errors as unknown as Record<string, unknown>);

  const onFormSubmit = async (data: PlaylistConfig) => {
    await onSubmit(data);
  };

  const onInvalidSubmit = (formErrors: FieldErrors<PlaylistConfig>) => {
    const errorCount = countAllErrors(formErrors as unknown as Record<string, unknown>);
    toast.error('Validation Failed', {
      description: `Please fix ${errorCount} error${errorCount !== 1 ? 's' : ''} before saving.`
    });
  };

  // --- Playlist Meta Sync Logic ---

  const playlistId = useWatch({ control, name: 'id' });
  const playlistName = useWatch({ control, name: 'name' });
  const imageUrl = useWatch({ control, name: 'imageUrl' });

  // Fetch playlist meta if we have ID but missing name or image
  const shouldFetchPlaylist =
    !!playlistId && playlistId.startsWith('spotify:playlist:') && (!playlistName || !imageUrl);

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
    if (fetchedPlaylist) {
      if (!getValues('name')) {
        setValue('name', fetchedPlaylist.name);
      }
      if (!getValues('imageUrl')) {
        setValue('imageUrl', fetchedPlaylist.imageUrl);
      }
    }
  }, [fetchedPlaylist, getValues, setValue]);

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit, onInvalidSubmit)}
      className="mx-auto w-full max-w-5xl"
    >
      <div className="space-y-6 pb-32 sm:space-y-8">
        {/* Section 1: Basic Info */}
        <section className="space-y-4">
          <BasicSettings
            control={control}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
          />
        </section>

        {/* Section 2: Curation Rules */}
        <section className="space-y-4">
          <RulesSettings control={control} register={register} errors={errors} />
        </section>

        {/* Section 3: AI Configuration */}
        <section className="space-y-4">
          <AiSettings control={control} register={register} errors={errors} watch={watch} />
        </section>

        {/* Section 4: Mandatory Tracks */}
        <section className="space-y-4">
          <TrackListSettings control={control} setValue={setValue} errors={errors} />
        </section>
      </div>

      {/* Floating Action Bar */}
      <div className="bg-background/80 border-border fixed right-0 bottom-0 left-0 z-50 border-t p-4 shadow-2xl backdrop-blur-xl supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom,20px)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          {/* Validation Error Indicator with Tooltip */}
          {totalErrors > 0 && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="text-destructive animate-in fade-in slide-in-from-left-2 bg-destructive/10 flex cursor-help items-center gap-2 rounded-full px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-bold">
                      {totalErrors}{' '}
                      <span className="hidden sm:inline">error{totalErrors !== 1 ? 's' : ''}</span>
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="bg-destructive text-destructive-foreground mb-4 max-w-[300px] space-y-1.5 border-none p-3 shadow-xl"
                >
                  <p className="mb-1 text-xs font-bold tracking-wider uppercase opacity-70">
                    Validation Details
                  </p>
                  {getFlatErrorMessages(errors as unknown as Record<string, unknown>).map(
                    (msg, i) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <span className="opacity-70">•</span>
                        <span>{msg}</span>
                      </div>
                    )
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <div className="flex-1" />
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className={cn(
              'w-full shadow-lg transition-all sm:w-auto',
              totalErrors > 0 && 'opacity-90'
            )}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            <span className="sm:inline">Save Configuration</span>
          </Button>
        </div>
      </div>
    </form>
  );
};
