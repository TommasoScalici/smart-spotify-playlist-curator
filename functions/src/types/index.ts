/**
 * Application configuration interfacing with environment variables.
 */
export interface AppConfig {
    spotifyClientId: string;
    spotifyClientSecret: string;
    spotifyRedirectUri: string;
    openAiApiKey: string;
}

/**
 * Settings for a specific playlist managed by the curator.
 */
export interface PlaylistSettings {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    rules: {
        minTempo?: number;
        maxTempo?: number;
        genres?: string[];
        // Add other rules as needed
    };
}

/**
 * Definition of a track that must be included in a playlist.
 */
export interface MandatoryTrack {
    uri: string;
    position?: number; // Desired position in the playlist
}

/**
 * Represents a range of positions in a playlist.
 */
export interface PositionRange {
    start: number;
    end: number;
}

/**
 * Configuration for the AI curator logic.
 */
export interface AiCuratorConfig {
    model: string;
    temperature: number;
    maxTokens?: number;
}
