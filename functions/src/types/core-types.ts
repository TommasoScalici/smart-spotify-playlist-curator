export interface PositionRange {
    min: number;
    max: number;
}

export interface MandatoryTrack {
    uri: string;
    positionRange: PositionRange;
    note?: string;
    comment?: string;
}

export interface AiGenerationConfig {
    model: string;
    prompt: string;
    temperature: number;
    /** How many new tracks to add per run (max) */
    refillBatchSize?: number;
    /** Whether the playlist should strictly exclude vocals */
    isInstrumentalOnly?: boolean;
}

export interface CurationRules {
    /** How many days a non-mandatory track can stay in the playlist */
    maxTrackAgeDays: number;
    /** Whether to aggressively remove duplicates found in the playlist */
    removeDuplicates: boolean;
}

export interface TrackWithMeta {
    uri: string;
    addedAt: Date;
    isVip: boolean;
    originalIndex?: number;
}

export interface ProcessingResult {
    keptTracks: TrackWithMeta[];
    tracksToRemove: string[];
    slotsNeeded: number;
}

export interface PlaylistSettings {
    targetTotalTracks: number;
    description?: string;
    allowExplicit?: boolean;
    referenceArtists?: string[];
}

export interface PlaylistConfig {
    id: string; // Spotify Playlist ID or URI
    name: string; // Human readable name
    enabled: boolean;
    dryRun?: boolean; // If true, no changes will be applied to Spotify
    mandate?: "exact" | "flexible"; // How strict the rules are
    settings: PlaylistSettings;
    mandatoryTracks: MandatoryTrack[]; // Tracks that MUST exist (VIPs)
    aiGeneration: AiGenerationConfig; // Prompt instructions
    curationRules: CurationRules;
}
