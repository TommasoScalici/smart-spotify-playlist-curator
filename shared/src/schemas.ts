import { z } from 'zod';

export const TrackInfoSchema = z.object({
  addedAt: z.string(),
  album: z.string(),
  artist: z.string(),
  imageUrl: z.string().optional(),
  name: z.string(),
  popularity: z.number().min(0).max(100).optional(),
  uri: z.string()
});

export type TrackInfo = z.infer<typeof TrackInfoSchema>;

// --- Sub-schemas ---

export const PositionRangeSchema = z.object({
  max: z.number().min(1),
  min: z.number().min(1)
});

export const MandatoryTrackSchema = z.object({
  artist: z.string().optional(),
  comment: z.string().optional(),
  imageUrl: z.string().optional(),
  name: z.string().optional(),
  note: z.string().optional(),
  positionRange: PositionRangeSchema.default({ max: 1, min: 1 }),
  uri: z.string().startsWith('spotify:track:', { message: 'Must be a valid Spotify Track URI' })
});

export const AiGenerationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  isInstrumentalOnly: z.boolean().default(false).optional(),
  model: z.string().default('gemini-2.5-flash'),
  temperature: z.number().min(0).max(1).default(0.7),
  tracksToAdd: z.number().min(0).max(50).default(10)
});

// --- Search Result Schema ---

export const SearchResultSchema = z.object({
  artist: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  name: z.string(),
  owner: z.string().optional(),
  ownerId: z.string().optional(),
  popularity: z.number().optional(),
  type: z.enum(['track', 'playlist', 'artist']),
  uri: z.string()
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const CurationRulesSchema = z.object({
  maxTrackAgeDays: z.number().min(1).default(30),
  maxTracksPerArtist: z.number().min(1).default(2),
  removeDuplicates: z.boolean().default(true),
  shuffleAtEnd: z.boolean().default(true),
  sizeLimitStrategy: z
    .enum(['drop_newest', 'drop_oldest', 'drop_random', 'drop_most_popular', 'drop_least_popular'])
    .default('drop_random')
});

export const PlaylistSettingsSchema = z.object({
  allowExplicit: z.boolean().optional(),
  description: z.string().optional(),
  referenceArtists: z.array(SearchResultSchema).default([]),
  targetTotalTracks: z.number().min(5).max(999)
});

// --- Curation Status Schema ---

export const BaseTrackSchema = z.object({
  artist: z.string(),
  name: z.string(),
  uri: z.string()
});

export const TrackDiffSchema = BaseTrackSchema.extend({
  reason: z.enum(['duplicate', 'expired', 'artist_limit', 'size_limit', 'other']).optional()
});

export const CurationDiffSchema = z.object({
  added: z.array(BaseTrackSchema),
  keptMandatory: z.array(BaseTrackSchema).optional(),
  removed: z.array(TrackDiffSchema),
  stats: z
    .object({
      final: z.number(),
      success: z.boolean(),
      target: z.number()
    })
    .optional()
});

export const ActivityMetadataSchema = z.object({
  addedCount: z.number().default(0),
  aiTracksAdded: z.number().default(0),
  artistLimitRemoved: z.number().default(0),
  diff: CurationDiffSchema.optional(),
  dryRun: z.boolean().default(false),
  duplicatesRemoved: z.number().default(0),
  error: z.string().optional(),
  expiredRemoved: z.number().default(0),
  finalCount: z.number().default(0),
  playlistId: z.string(),
  playlistName: z.string(),
  progress: z.number().default(0),
  removedCount: z.number().default(0),
  sizeLimitRemoved: z.number().default(0),
  state: z.enum(['idle', 'running', 'completed', 'error']).default('idle'),
  step: z.string().optional(),
  triggeredBy: z.string().optional()
});

export const ActivityLogSchema = z.object({
  deleted: z.boolean().default(false).optional(),
  id: z.string().optional(),
  metadata: ActivityMetadataSchema,
  timestamp: z.any().optional(), // Firestore Timestamp
  type: z.string().optional()
});

export const CurationStatusSchema = z.object({
  diff: CurationDiffSchema.optional(),
  isDryRun: z.boolean().optional(),
  lastUpdated: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  state: z.enum(['idle', 'running', 'completed', 'error']).default('idle'),
  step: z.string().optional()
});

// --- Main Schema ---

export const PlaylistConfigSchema = z.object({
  aiGeneration: AiGenerationConfigSchema.default({
    enabled: true,
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    tracksToAdd: 10
  }),
  curationRules: CurationRulesSchema.default({
    maxTrackAgeDays: 30,
    maxTracksPerArtist: 2,
    removeDuplicates: true,
    shuffleAtEnd: true,
    sizeLimitStrategy: 'drop_random'
  }),
  enabled: z.boolean().default(true),
  id: z
    .string()
    .min(1, 'you have to select the target playlist')
    .startsWith('spotify:playlist:', { message: 'Must be a valid Spotify Playlist URI' }),
  imageUrl: z.string().optional().nullable(),
  mandatoryTracks: z.array(MandatoryTrackSchema).default([]),
  name: z.string(), // Name should be required as well
  ownerId: z.string().min(1, 'Owner ID is required'),
  settings: PlaylistSettingsSchema.default({
    referenceArtists: [],
    targetTotalTracks: 20
  })
});

// --- User Schema ---

export const SpotifyProfileSchema = z.object({
  authError: z.string().optional(),
  avatarUrl: z.string().url().nullable(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  id: z.string(),
  linkedAt: z.date(),
  product: z.string(),
  status: z.enum(['active', 'invalid']).default('active')
});

export const UserSchema = z.object({
  createdAt: z.date(),
  displayName: z.string().optional(),
  email: z.string().email(),
  lastLoginAt: z.date(),
  photoURL: z.string().url().optional(),
  spotifyProfile: SpotifyProfileSchema.optional().nullable(),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  uid: z.string()
});

// --- Playlist Metrics Schema ---

export const PlaylistMetricsSchema = z.object({
  followers: z.number(),
  lastUpdated: z.string(), // ISO 8601 timestamp
  tracks: z.number()
});

export type ActivityLog = z.infer<typeof ActivityLogSchema>;
export type ActivityMetadata = z.infer<typeof ActivityMetadataSchema>;
export type AiGenerationConfig = z.infer<typeof AiGenerationConfigSchema>;

export type CurationDiff = z.infer<typeof CurationDiffSchema>;
export type CurationRules = z.infer<typeof CurationRulesSchema>;
export type CurationStatus = z.infer<typeof CurationStatusSchema>;
export type MandatoryTrack = z.infer<typeof MandatoryTrackSchema>;
// Infer TS types from Zod schemas
export type PlaylistConfig = z.infer<typeof PlaylistConfigSchema>;
export type PlaylistMetrics = z.infer<typeof PlaylistMetricsSchema>;
export type PlaylistSettings = z.infer<typeof PlaylistSettingsSchema>;
export type PositionRange = z.infer<typeof PositionRangeSchema>;
export type SpotifyProfile = z.infer<typeof SpotifyProfileSchema>;
export type UserProfile = z.infer<typeof UserSchema>;

// --- Orchestration Response Schema ---

export const OrchestrationResultSchema = z.object({
  message: z.string(),
  results: z.array(
    z.object({
      error: z.string().optional(),
      name: z.string(),
      status: z.enum(['success', 'error'])
    })
  )
});

// --- Estimation Result ---

export const CurationEstimateSchema = z.object({
  added: z
    .array(BaseTrackSchema.extend({ source: z.enum(['ai', 'mandatory']).optional() }))
    .optional(),
  agedOutTracks: z.number(),
  aiTracksToAdd: z.number(),
  artistLimitRemoved: z.number(),
  currentTracks: z.number(),
  duplicatesToRemove: z.number(),
  mandatoryToAdd: z.number(),
  planId: z.string().optional(),
  predictedFinal: z.number(),
  removed: z.array(TrackDiffSchema).optional(),
  sizeLimitRemoved: z.number()
});

export type CurationEstimate = z.infer<typeof CurationEstimateSchema>;

// --- Request Schemas ---

export const TriggerCurationRequestSchema = z.object({
  planId: z.string().optional(),
  playlistId: z.string().min(1, 'Playlist ID is required')
});

export const EstimateCurationRequestSchema = z.object({
  playlistId: z.string().min(1, 'Playlist ID is required')
});

export type BaseTrack = z.infer<typeof BaseTrackSchema>;
export type EstimateCurationRequest = z.infer<typeof EstimateCurationRequestSchema>;

export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>;
export type TrackDiff = z.infer<typeof TrackDiffSchema>;

export type TriggerCurationRequest = z.infer<typeof TriggerCurationRequestSchema>;
