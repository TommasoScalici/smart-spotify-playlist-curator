import { TrackInfo } from '@smart-spotify-curator/shared';

export type { TrackInfo };

export interface SearchResult {
  uri: string;
  name: string;
  artist?: string;
  owner?: string;
  ownerId?: string;
  description?: string;
  imageUrl?: string;
  popularity?: number;
  type: 'track' | 'playlist' | 'artist';
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}
