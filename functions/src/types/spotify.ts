import { SearchResult, TrackInfo } from '@smart-spotify-curator/shared';

export type { SearchResult, TrackInfo };

export interface SpotifyTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}
