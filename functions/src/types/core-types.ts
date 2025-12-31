
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
