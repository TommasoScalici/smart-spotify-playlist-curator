export interface ProcessingResult {
  keptTracks: TrackWithMeta[];
  slotsNeeded: number;
  tracksToRemove: string[];
}

// Internal types used only within functions (not in shared schema)
export interface TrackWithMeta {
  addedAt: Date;
  album: string;
  artist: string; // Added for smart filtering
  isVip: boolean;
  name: string; // Added for semantic exclusion
  originalIndex?: number;
  popularity?: number;
  uri: string;
}
