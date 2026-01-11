import { zodResolver } from '@hookform/resolvers/zod';
import { PlaylistConfig, PlaylistConfigSchema } from '@smart-spotify-curator/shared';
import { Save, Loader2, Plus, Trash2, HelpCircle, Music, X } from 'lucide-react';
import { SpotifySearch } from './SpotifySearch';
import {
  useForm,
  useFieldArray,
  Controller,
  Resolver,
  UseFormRegister,
  Control,
  FieldErrors,
  useWatch,
  UseFormSetValue
} from 'react-hook-form';
import { useState, useEffect } from 'react';
import { FunctionsService } from '../services/functions-service';
import { useQuery } from '@tanstack/react-query';

interface ConfigEditorProps {
  initialConfig?: PlaylistConfig;
  onSubmit: (data: PlaylistConfig) => Promise<void>;
}

const DEFAULT_CONFIG: Partial<PlaylistConfig> = {
  enabled: true,
  settings: {
    targetTotalTracks: 20,
    description: '',
    allowExplicit: false,
    referenceArtists: []
  },
  aiGeneration: {
    prompt: 'Create a playlist that...',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    overfetchRatio: 2.0
  },
  curationRules: {
    maxTrackAgeDays: 365,
    removeDuplicates: true
  },
  mandatoryTracks: []
};

// --- Helper Components ---

interface TrackRowProps {
  index: number;
  control: Control<PlaylistConfig>;
  register: UseFormRegister<PlaylistConfig>;
  setValue: UseFormSetValue<PlaylistConfig>;
  remove: (index: number) => void;
  errors: FieldErrors<PlaylistConfig>;
}

const TrackRow = ({ index, control, register, setValue, remove, errors }: TrackRowProps) => {
  // We watch the full object for this field to get metadata if it exists
  const trackValue = useWatch({
    control,
    name: `mandatoryTracks.${index}` as const
  });

  // Side effect: Only fetch if we have a URI but NO stored metadata and NO fetched metadata
  // Derived display data: Prefer stored (fast), fall back to fetched (slow)
  const shouldFetch =
    !!trackValue.uri && trackValue.uri.startsWith('spotify:track:') && !trackValue.name;

  const { data: fetchedData, isLoading: loading } = useQuery({
    queryKey: ['spotify', 'track', trackValue.uri],
    queryFn: async () => {
      if (!trackValue.uri) return null;
      const results = await FunctionsService.searchSpotify(trackValue.uri, 'track');
      return results && results.length > 0 ? results[0] : null;
    },
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 60 // Cache for 1 hour
  });

  const displayMeta = {
    name: trackValue.name || fetchedData?.name || trackValue.uri,
    artist: trackValue.artist || fetchedData?.artist,
    imageUrl: trackValue.imageUrl || fetchedData?.imageUrl
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 3fr 1fr 1fr auto',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '12px',
        background: 'rgba(255,255,255,0.02)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <Controller
        control={control}
        name={`mandatoryTracks.${index}.uri` as const}
        render={({ field }) => {
          // If no URI, show Search
          if (!field.value) {
            return (
              <div style={{ gridColumn: '1 / span 2' }}>
                <SpotifySearch
                  type="track"
                  placeholder="Search track..."
                  onSelect={(result) => {
                    // Update ALL fields using setValue
                    setValue(`mandatoryTracks.${index}.uri`, result.uri);
                    setValue(`mandatoryTracks.${index}.name`, result.name);
                    if (result.artist) setValue(`mandatoryTracks.${index}.artist`, result.artist);
                    if (result.imageUrl)
                      setValue(`mandatoryTracks.${index}.imageUrl`, result.imageUrl);
                  }}
                />
                {errors.mandatoryTracks?.[index]?.uri && (
                  <span style={{ color: '#ff4d4f', fontSize: '0.8rem' }}>Required</span>
                )}
              </div>
            );
          }

          // Display View
          return (
            <>
              {/* Image Col */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} color="#666" />
                ) : displayMeta.imageUrl ? (
                  <img
                    src={displayMeta.imageUrl}
                    alt="Art"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Music size={20} color="#666" />
                )}
              </div>

              {/* Meta Col */}
              <div
                style={{
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {displayMeta.name}
                </div>
                {displayMeta.artist && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {displayMeta.artist}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)',
                    marginTop: '2px',
                    opacity: 0.5
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange('');
                      // Optional: Clear stored metadata too?
                      // Yes, to be clean.
                      setValue(`mandatoryTracks.${index}.name`, undefined);
                      setValue(`mandatoryTracks.${index}.artist`, undefined);
                      setValue(`mandatoryTracks.${index}.imageUrl`, undefined);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      padding: 0,
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>
            </>
          );
        }}
      />

      {/* Min Pos */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <input
          type="number"
          {...register(`mandatoryTracks.${index}.positionRange.min` as const, {
            valueAsNumber: true
          })}
          placeholder="Min"
          title="Min Position"
          className="form-input"
          style={{ padding: '8px', width: '100%' }}
        />
      </div>

      {/* Max Pos */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <input
          type="number"
          {...register(`mandatoryTracks.${index}.positionRange.max` as const, {
            valueAsNumber: true
          })}
          placeholder="Max"
          title="Max Position"
          className="form-input"
          style={{ padding: '8px', width: '100%' }}
        />
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => remove(index)}
        style={{
          padding: '8px',
          color: '#ff4d4f',
          background: 'rgba(255, 77, 79, 0.1)',
          border: '1px solid rgba(255, 77, 79, 0.2)',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Remove Track"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// --- Main Component ---

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
    defaultValues: initialConfig || (DEFAULT_CONFIG as PlaylistConfig)
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'mandatoryTracks'
  });

  const onFormSubmit = async (data: PlaylistConfig) => {
    await onSubmit(data);
  };

  // Watch playlist ID to show selected state
  const playlistId = watch('id');
  const playlistName = watch('name');
  const [playlistMeta, setPlaylistMeta] = useState<{ imageUrl?: string; owner?: string } | null>(
    null
  );

  // Fetch playlist meta if we have ID but no visuals (e.g. on load)
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

  // Sync effect for playlist name (one-way sync from cache to form if form is empty)
  useEffect(() => {
    if (fetchedPlaylist && !getValues('name')) {
      setValue('name', fetchedPlaylist.name);
    }
  }, [fetchedPlaylist, getValues, setValue]);

  const displayPlaylistMeta = {
    imageUrl: playlistMeta?.imageUrl || fetchedPlaylist?.imageUrl,
    owner: playlistMeta?.owner || fetchedPlaylist?.owner || fetchedPlaylist?.name // fallback
  };

  interface InputGroupProps {
    label: string;
    error?: { message?: string };
    children: React.ReactNode;
    help?: string;
  }

  const InputGroup = ({ label, error, children, help }: InputGroupProps) => (
    <div className="form-group" style={{ marginBottom: '20px' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500,
          color: 'var(--text-primary)'
        }}
      >
        {label}
        {help && (
          <span
            title={help}
            style={{ marginLeft: '8px', color: 'var(--text-secondary)', cursor: 'help' }}
          >
            <HelpCircle size={14} style={{ display: 'inline' }} />
          </span>
        )}
      </label>
      {children}
      {error && (
        <span style={{ color: '#ff4d4f', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
          {error.message}
        </span>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="config-editor">
      {/* Basic Settings */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
            marginBottom: '20px'
          }}
        >
          Basic Settings
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <InputGroup
            label="Playlist"
            error={errors.id}
            help="Select the Spotify Playlist to curate."
          >
            {/* If we have a playlist ID, show the 'Selected' card, else show Search */}
            {!playlistId ? (
              <Controller
                control={control}
                name="id"
                render={({ field }) => (
                  <SpotifySearch
                    type="playlist"
                    placeholder="Search for a playlist..."
                    onSelect={(result) => {
                      field.onChange(result.uri);
                      setValue('name', result.name);
                      setPlaylistMeta({ imageUrl: result.imageUrl, owner: result.owner });
                      if (result.owner) {
                        setValue(
                          'settings.description',
                          `Curated version of ${result.name} by ${result.owner}`
                        );
                      }
                    }}
                  />
                )}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: 'rgba(29, 185, 84, 0.1)',
                  border: '1px solid rgba(29, 185, 84, 0.3)',
                  borderRadius: '8px'
                }}
              >
                {displayPlaylistMeta.imageUrl ? (
                  <img
                    src={displayPlaylistMeta.imageUrl}
                    alt="Cover"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '4px',
                      background: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Music size={24} color="#666" />
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'white' }}>
                    {playlistName || playlistId}
                  </h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {displayPlaylistMeta.owner
                      ? `by ${displayPlaylistMeta.owner}`
                      : 'Custom Playlist'}
                  </p>
                </div>

                <button
                  type="button"
                  className="hover-btn"
                  onClick={() => {
                    setValue('id', '');
                    setValue('name', '');
                    setPlaylistMeta(null);
                  }}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '50%',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  title="Change Playlist"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </InputGroup>
        </div>

        <InputGroup label="Description" error={errors.settings?.description}>
          <textarea
            {...register('settings.description')}
            className="form-input"
            rows={3}
            placeholder="A brief description for the playlist cover."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              resize: 'vertical'
            }}
          />
        </InputGroup>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <input
            type="checkbox"
            {...register('enabled')}
            id="enabled-check"
            style={{ width: '18px', height: '18px' }}
          />
          <label htmlFor="enabled-check" style={{ cursor: 'pointer' }}>
            Enable automated curation for this playlist
          </label>
        </div>
      </div>

      {/* AI Settings */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
            marginBottom: '20px'
          }}
        >
          AI Configuration
        </h3>

        <InputGroup
          label="Prompt"
          error={errors.aiGeneration?.prompt}
          help="Instructions for the AI curator."
        >
          <textarea
            {...register('aiGeneration.prompt')}
            rows={5}
            placeholder="Give me 20 songs that sound like late night rainy jazz..."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              resize: 'vertical'
            }}
          />
        </InputGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <InputGroup label="Target Track Count" error={errors.settings?.targetTotalTracks}>
            <input
              type="number"
              {...register('settings.targetTotalTracks', { valueAsNumber: true })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white'
              }}
            />
          </InputGroup>
        </div>
      </div>

      {/* Rules */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
            marginBottom: '20px'
          }}
        >
          Curation Rules
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <InputGroup label="Max Track Age (Days)" error={errors.curationRules?.maxTrackAgeDays}>
            <input
              type="number"
              {...register('curationRules.maxTrackAgeDays', { valueAsNumber: true })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white'
              }}
            />
          </InputGroup>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <input
              type="checkbox"
              {...register('curationRules.removeDuplicates')}
              id="dedup-check"
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="dedup-check" style={{ cursor: 'pointer' }}>
              Remove Duplicates
            </label>
          </div>
        </div>
      </div>

      {/* Mandatory Tracks */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px'
          }}
        >
          <h3 style={{ margin: 0 }}>Mandatory Tracks</h3>
          <button
            type="button"
            onClick={() => append({ uri: '', positionRange: { min: 1, max: 1 } })}
            style={{
              background: 'transparent',
              color: 'var(--primary)',
              border: '1px solid var(--primary)',
              padding: '6px 12px',
              borderRadius: '6px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              fontSize: '0.9rem'
            }}
          >
            <Plus size={16} /> Add Track
          </button>
        </div>

        {fields.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>No mandatory tracks configured.</p>
        )}

        {fields.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 3fr 1fr 1fr auto',
              gap: '12px',
              marginBottom: '8px',
              paddingLeft: '8px',
              paddingRight: '8px',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <div></div>
            <div>Track Info</div>
            <div>Min Pos</div>
            <div>Max Pos</div>
            <div></div>
          </div>
        )}

        {fields.map((field, index) => (
          <TrackRow
            key={field.id}
            index={index}
            control={control}
            register={register}
            setValue={setValue} // Passing setValue to the component
            remove={remove}
            errors={errors}
          />
        ))}
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: '20px',
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '20px'
        }}
      >
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 32px',
            fontSize: '1.1rem',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
          }}
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          Save Configuration
        </button>
      </div>
    </form>
  );
};
