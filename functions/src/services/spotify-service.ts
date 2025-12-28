import SpotifyWebApi from "spotify-web-api-node";
import { config } from "../config/env";

export interface TrackInfo {
    uri: string;
    name: string;
    artist: string;
    addedAt: string;
}

export class SpotifyService {
    private static instance: SpotifyService;
    private spotifyApi: SpotifyWebApi;
    private tokenExpirationEpoch: number = 0;

    private constructor() {
        this.spotifyApi = new SpotifyWebApi({
            clientId: config.SPOTIFY_CLIENT_ID,
            clientSecret: config.SPOTIFY_CLIENT_SECRET,
            refreshToken: config.SPOTIFY_REFRESH_TOKEN,
        });
    }

    public static getInstance(): SpotifyService {
        if (!SpotifyService.instance) {
            SpotifyService.instance = new SpotifyService();
        }
        return SpotifyService.instance;
    }

    /**
     * Ensures a valid access token exists. Refreshes if expired or missing.
     */
    private async ensureAccessToken(): Promise<void> {
        const now = Date.now();
        // Refresh if token is missing or expires in less than 5 minutes
        if (now + 5 * 60 * 1000 > this.tokenExpirationEpoch) {
            try {
                const data = await this.spotifyApi.refreshAccessToken();
                const accessToken = data.body["access_token"];
                const expiresInSeconds = data.body["expires_in"];

                this.spotifyApi.setAccessToken(accessToken);
                this.tokenExpirationEpoch = now + expiresInSeconds * 1000;
                // console.log("Refreshed Spotify Access Token");
            } catch (error) {
                console.error("Failed to refresh access token calling spotifyApi.refreshAccessToken():", error);
                throw error;
            }
        }
    }

    /**
     * Fetches ALL tracks from a playlist, handling pagination.
     * @param playlistId The Spotify ID of the playlist
     * @returns Array of simplified TrackInfo objects
     */
    public async getPlaylistTracks(playlistId: string): Promise<TrackInfo[]> {
        await this.ensureAccessToken();
        const allTracks: TrackInfo[] = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        try {
            while (hasMore) {
                const response = await this.spotifyApi.getPlaylistTracks(playlistId, { offset, limit });
                const items = response.body.items;

                for (const item of items) {
                    if (item.track && item.track.type === "track") { // Filter out episodes/nulls
                        allTracks.push({
                            uri: item.track.uri,
                            name: item.track.name,
                            artist: item.track.artists.map((a: any) => a.name).join(", "),
                            addedAt: item.added_at,
                        });
                    }
                }

                if (items.length < limit) {
                    hasMore = false;
                } else {
                    offset += limit;
                }
            }
            return allTracks;
        } catch (error) {
            console.error(`Error fetching tracks for playlist ${playlistId}:`, error);
            throw error;
        }
    }

    /**
     * Searches for a track based on a query string (Advisor - Title).
     * @param query Search query text
     * @returns The URI of the first match, or null if not found
     */
    public async searchTrack(query: string): Promise<string | null> {
        await this.ensureAccessToken();
        try {
            const response = await this.spotifyApi.searchTracks(query, { limit: 1 });
            const tracks = response.body.tracks?.items;
            if (tracks && tracks.length > 0) {
                return tracks[0].uri;
            }
            return null;
        } catch (error) {
            console.error(`Error searching track '${query}':`, error);
            return null;
        }
    }

    /**
     * Adds tracks to a playlist, handling batching (max 100 per request).
     * @param playlistId Target playlist ID
     * @param uris Array of track URIs to add
     */
    public async addTracks(playlistId: string, uris: string[]): Promise<void> {
        await this.ensureAccessToken();
        if (uris.length === 0) return;

        try {
            // Chunk into batches of 100
            for (let i = 0; i < uris.length; i += 100) {
                const batch = uris.slice(i, i + 100);
                await this.spotifyApi.addTracksToPlaylist(playlistId, batch);
            }
        } catch (error) {
            console.error(`Error adding tracks to playlist ${playlistId}:`, error);
            throw error;
        }
    }

    /**
     * Removes tracks from a playlist, handling batching (max 100 per request).
     * Note: This removes ALL occurrences of the track in the playlist.
     * @param playlistId Target playlist ID
     * @param uris Array of track URIs to remove
     */
    public async removeTracks(playlistId: string, uris: string[]): Promise<void> {
        await this.ensureAccessToken();
        if (uris.length === 0) return;

        try {
            // Chunk into batches of 100
            for (let i = 0; i < uris.length; i += 100) {
                const batch = uris.slice(i, i + 100).map((uri) => ({ uri }));
                await this.spotifyApi.removeTracksFromPlaylist(playlistId, batch);
            }
        } catch (error) {
            console.error(`Error removing tracks from playlist ${playlistId}:`, error);
            throw error;
        }
    }
}
