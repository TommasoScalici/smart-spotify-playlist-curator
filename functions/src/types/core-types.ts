import {
  PlaylistConfig,
  MandatoryTrack,
  AiGenerationConfig,
  CurationRules,
  PlaylistSettings,
  PositionRange
} from '@smart-spotify-curator/shared';

export type {
  PlaylistConfig,
  MandatoryTrack,
  AiGenerationConfig,
  CurationRules,
  PlaylistSettings,
  PositionRange
};

export interface TrackWithMeta {
  uri: string;
  name: string; // Added for semantic exclusion
  artist: string; // Added for smart filtering
  addedAt: Date;
  isVip: boolean;
  originalIndex?: number;
}

export interface ProcessingResult {
  keptTracks: TrackWithMeta[];
  tracksToRemove: string[];
  slotsNeeded: number;
}
