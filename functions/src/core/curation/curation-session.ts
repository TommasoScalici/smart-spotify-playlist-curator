import { CurationDiff, PlaylistConfig } from '@smart-spotify-curator/shared';

import { TrackInfo } from '../../types/spotify';
import { TrackWithMeta } from '../types-internal';

export interface CurationSession {
  config: PlaylistConfig;
  playlistId: string;
  dryRun: boolean;
  ownerName?: string;
  logId?: string;

  // State
  currentTracks: TrackInfo[];
  survivingTracks: TrackWithMeta[];
  newAiTracks: {
    uri: string;
    artist: string;
    track: string;
    popularity?: number;
    addedAt?: Date;
  }[];
  finalTrackList: string[];

  // Diff results
  diff?: CurationDiff;
}
