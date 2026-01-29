import { PlaylistConfig } from '@smart-spotify-curator/shared';

export const DEFAULT_PLAYLIST_CONFIG: Partial<PlaylistConfig> = {
  enabled: true,
  name: '',
  ownerId: '',
  settings: {
    targetTotalTracks: 20,
    description: '',
    allowExplicit: false,
    referenceArtists: []
  },
  aiGeneration: {
    enabled: true,
    tracksToAdd: 10,
    model: 'gemini-2.5-flash',
    temperature: 0.7
  },
  curationRules: {
    maxTrackAgeDays: 365,
    removeDuplicates: true,
    maxTracksPerArtist: 2,
    shuffleAtEnd: true,
    sizeLimitStrategy: 'drop_random'
  },
  mandatoryTracks: []
};
