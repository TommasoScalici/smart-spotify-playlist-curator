import { DEFAULT_AI_MODEL, PlaylistConfig } from '@smart-spotify-curator/shared';

export const DEFAULT_PLAYLIST_CONFIG: Partial<PlaylistConfig> = {
  aiGeneration: {
    enabled: true,
    model: DEFAULT_AI_MODEL,
    temperature: 0.5,
    tracksToAdd: 10
  },
  curationRules: {
    maxTrackAgeDays: 365,
    maxTracksPerArtist: 2,
    removeDuplicates: true,
    shuffleAtEnd: true,
    sizeLimitStrategy: 'drop_random'
  },
  enabled: true,
  mandatoryTracks: [],
  name: '',
  ownerId: '',
  settings: {
    allowExplicit: false,
    description: '',
    referenceArtists: [],
    targetTotalTracks: 20
  }
};
