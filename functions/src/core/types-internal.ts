// Internal types used only within functions (not in shared schema)
export interface TrackWithMeta {
  uri: string;
  name: string; // Added for semantic exclusion
  artist: string; // Added for smart filtering
  addedAt: Date;
  isVip: boolean;
  originalIndex?: number;
}

export interface ProcessingResult {
  keptTracks: TrackWithMeta[];
  tracksToRemove: string[];
  slotsNeeded: number;
}
