
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
