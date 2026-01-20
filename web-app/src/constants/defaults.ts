import { PlaylistConfig } from '@smart-spotify-curator/shared';

export const DEFAULT_PLAYLIST_CONFIG: Partial<PlaylistConfig> = {
  enabled: true,
  settings: {
    targetTotalTracks: 20,
    description: '',
    allowExplicit: false,
    referenceArtists: []
  },
  aiGeneration: {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    overfetchRatio: 2.0
  },
  curationRules: {
    maxTrackAgeDays: 365,
    removeDuplicates: true,
    maxTracksPerArtist: 2
  },
  mandatoryTracks: []
};
