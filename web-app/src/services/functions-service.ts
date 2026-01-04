import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface CurationResult {
    message: string;
    results: unknown[];
}

export interface SpotifySearchResult {
    uri: string;
    name: string;
    type: 'track' | 'playlist' | 'artist';
    imageUrl?: string;
    owner?: string;
    artist?: string;
}

export const FunctionsService = {
    /**
     * Triggers the curation orchestration manually.
     * Calls the 'triggerCuration' Cloud Function.
     */
    async triggerCuration(playlistId?: string): Promise<CurationResult> {
        const trigger = httpsCallable<{ playlistId?: string }, CurationResult>(functions, 'triggerCuration');
        const result = await trigger({ playlistId });
        return result.data;
    },

    /**
     * Search Spotify for tracks or playlists via Cloud Function Proxy.
     */
    async searchSpotify(query: string, type: 'track' | 'playlist'): Promise<SpotifySearchResult[]> {
        const search = httpsCallable<{ query: string; type: string; limit: number }, { results: SpotifySearchResult[] }>(functions, 'searchSpotify');
        const result = await search({ query, type, limit: 10 });
        return result.data.results;
    }
};
