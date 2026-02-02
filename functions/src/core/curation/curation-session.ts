import { CurationDiff, PlaylistConfig } from '@smart-spotify-curator/shared';

import { TrackInfo } from '../../types/spotify';
import { TrackWithMeta } from '../types-internal';

export interface CurationSession {
  config: PlaylistConfig;
  // State
  currentTracks: TrackInfo[];
  // Diff results
  diff?: CurationDiff;
  dryRun: boolean;
  finalTrackList: string[];

  logId?: string;
  newAiTracks: {
    addedAt?: Date;
    artist: string;
    popularity?: number;
    track: string;
    uri: string;
  }[];
  ownerName?: string;
  playlistId: string;

  survivingTracks: TrackWithMeta[];
}
