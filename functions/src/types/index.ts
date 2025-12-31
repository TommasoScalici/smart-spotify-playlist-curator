export interface PositionRange {
    min: number;
    max: number;
}

export interface MandatoryTrack {
    uri: string;
    positionRange: PositionRange;
    note?: string;
}

export interface AiGenerationConfig {
    /** The technical prompt for the LLM to find matching tracks */
    prompt: string;
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

export interface PlaylistConfig {
    id: string;
    name: string; // Internal name for logs
    enabled: boolean;
    settings: {
        targetTotalTracks: number;
        description?: string;
        allowExplicit?: boolean;
        referenceArtists?: string[];
    };
    aiGeneration: AiGenerationConfig;
    curationRules: CurationRules;
    mandatoryTracks: MandatoryTrack[];
}

// The root config is now an array
export type AppConfig = PlaylistConfig[];