// Internal types used only within functions (not in shared schema)
export interface TrackWithMeta {
  uri: string;
  name: string; // Added for semantic exclusion
  artist: string; // Added for smart filtering
  album: string;
  addedAt: Date;
  isVip: boolean;
  originalIndex?: number;
  popularity?: number;
}

export interface ProcessingResult {
  keptTracks: TrackWithMeta[];
  tracksToRemove: string[];
  slotsNeeded: number;
}
