import { SearchResult, TrackInfo } from '@smart-spotify-curator/shared';

export type { TrackInfo, SearchResult };

export interface SpotifyTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}
