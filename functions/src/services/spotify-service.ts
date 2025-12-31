import SpotifyWebApi from "spotify-web-api-node";
import { config } from "../config/env";

export interface TrackInfo {
    uri: string;
    name: string;
    artist: string;
    addedAt: string;
    id: string; // Spotify ID (not URI) useful for some operations
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
     * Delay helper to avoid rate limits
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Executes an API operation with retry logic for 401 (Auth) and 429 (Rate Limit).
     */
    private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
        await this.ensureAccessToken();

        try {
            return await operation();
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (retries <= 0) throw error;

            // Handle 429 Too Many Requests
            if (error.statusCode === 429) {
                const retryAfter = error.headers && error.headers["retry-after"] ? parseInt(error.headers["retry-after"]) : 1;
                console.warn(`Rate limit hit. Waiting ${retryAfter} seconds...`);
                await this.delay((retryAfter * 1000) + 100); // Wait + buffer
                return this.executeWithRetry(operation, retries - 1);
            }

            // Handle 401 Unauthorized (Expired Token) - typically ensureAccessToken handles this, but double check
            if (error.statusCode === 401) {
                console.warn("Got 401, refreshing token and retrying...");
                this.tokenExpirationEpoch = 0; // Force refresh
                await this.ensureAccessToken();
                return this.executeWithRetry(operation, retries - 1);
            }

            throw error;
        }
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

            } catch (error) {
                console.error("Failed to refresh access token:", error);
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
        const allTracks: TrackInfo[] = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        await this.executeWithRetry(async () => {
            while (hasMore) {
                const response = await this.spotifyApi.getPlaylistTracks(playlistId, { offset, limit });
                const items = response.body.items;

                for (const item of items) {
                    if (item.track && item.track.type === "track") {
                        allTracks.push({
                            uri: item.track.uri,
                            name: item.track.name,
                            artist: item.track.artists.map((a: { name: string }) => a.name).join(", "),
                            addedAt: item.added_at,
                            id: item.track.id,
                        });
                    }
                }

                if (items.length < limit) {
                    hasMore = false;
                } else {
                    offset += limit;
                }
            }
        });

        return allTracks;
    }

    public async searchTrack(query: string): Promise<string | null> {
        return this.executeWithRetry(async () => {
            const response = await this.spotifyApi.searchTracks(query, { limit: 1 });
            const tracks = response.body.tracks?.items;
            if (tracks && tracks.length > 0) {
                return tracks[0].uri;
            }
            return null;
        });
    }

    public async removeTracks(playlistId: string, uris: string[]): Promise<void> {
        if (uris.length === 0) return;

        // Chunk into batches of 100
        for (let i = 0; i < uris.length; i += 100) {
            const batch = uris.slice(i, i + 100).map((uri) => ({ uri }));
            await this.executeWithRetry(() => this.spotifyApi.removeTracksFromPlaylist(playlistId, batch));
        }
    }

    public async addTracks(playlistId: string, uris: string[]): Promise<void> {
        if (uris.length === 0) return;

        // Chunk into batches of 100
        for (let i = 0; i < uris.length; i += 100) {
            const batch = uris.slice(i, i + 100);
            await this.executeWithRetry(() => this.spotifyApi.addTracksToPlaylist(playlistId, batch));
        }
    }

    /**
     * Performs a surgical update to the playlist:
     * 1. Removes specified tracks.
     * 2. Appends new tracks.
     * 3. Reorders tracks to match the target order ONE BY ONE to preserve timestamps.
     * WARNING: This is slow due to rate limiting (500ms delay per move).
     */
    public async performSmartUpdate(
        playlistId: string,
        tracksToRemove: string[],
        tracksToAdd: string[],
        targetOrderedUris: string[]
    ): Promise<void> {
        console.log(`Starting Smart Update for ${playlistId}`);

        // 1. Remove
        if (tracksToRemove.length > 0) {

            await this.removeTracks(playlistId, tracksToRemove);
        }

        // 2. Add (Append)
        if (tracksToAdd.length > 0) {

            await this.addTracks(playlistId, tracksToAdd);
        }

        // 3. Reorder Logic

        // Re-fetch to get accurate positions after add/remove
        const currentTracks = await this.getPlaylistTracks(playlistId);
        const currentOrder = currentTracks.map(t => t.uri);

        // Validation check
        if (currentOrder.length !== targetOrderedUris.length) {
            console.warn(`Mismatch in track counts! Current: ${currentOrder.length}, Target: ${targetOrderedUris.length}. Reordering might be imperfect.`);
            // Proceed anyway to fix what we can, or strict error? 
            // Better to warn and proceed for robustness.
        }

        // Fetch initial snapshot ID
        const playlistData = await this.executeWithRetry(() => this.spotifyApi.getPlaylist(playlistId, { fields: 'snapshot_id' }));
        let snapshotId = playlistData.body.snapshot_id;


        // let moves = 0;

        for (let i = 0; i < targetOrderedUris.length; i++) {
            const targetUri = targetOrderedUris[i];

            // Safety check if we ran out of bounds in currentOrder
            if (i >= currentOrder.length) break;

            if (currentOrder[i] !== targetUri) {
                // Mismatch found at position i.
                const currentIndex = currentOrder.indexOf(targetUri, i); // Search from i onwards

                if (currentIndex === -1) {
                    console.error(`Track ${targetUri} expected at pos ${i} but not found in remaining playlist! Skipping.`);
                    continue;
                }



                // Pass snapshot_id to ensure we are modifying the latest version
                const response = await this.executeWithRetry(() =>
                    this.spotifyApi.reorderTracksInPlaylist(playlistId, currentIndex, i, { snapshot_id: snapshotId })
                );

                // Update snapshot_id for the next call
                snapshotId = response.body.snapshot_id;


                // Wait to respect rate limits
                await this.delay(500);

                // Update local state
                const [movedTrack] = currentOrder.splice(currentIndex, 1);
                currentOrder.splice(i, 0, movedTrack);

                // moves++;
            }
        }


    }
}
