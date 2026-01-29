import { z } from 'zod';

export const TrackInfoSchema = z.object({
  uri: z.string(),
  name: z.string(),
  artist: z.string(),
  album: z.string(),
  imageUrl: z.string().optional(),
  addedAt: z.string(),
  popularity: z.number().min(0).max(100).optional()
});

export type TrackInfo = z.infer<typeof TrackInfoSchema>;

// --- Sub-schemas ---

export const PositionRangeSchema = z.object({
  min: z.number().min(1),
  max: z.number().min(1)
});

export const MandatoryTrackSchema = z.object({
  uri: z.string().startsWith('spotify:track:', { message: 'Must be a valid Spotify Track URI' }),
  name: z.string().optional(),
  artist: z.string().optional(),
  imageUrl: z.string().optional(),
  positionRange: PositionRangeSchema.default({ min: 1, max: 1 }),
  note: z.string().optional(),
  comment: z.string().optional()
});

export const AiGenerationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  tracksToAdd: z.number().min(0).max(50).default(10),
  model: z.string().default('gemini-2.5-flash'),
  temperature: z.number().min(0).max(1).default(0.7),
  isInstrumentalOnly: z.boolean().default(false).optional()
});

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
  targetTotalTracks: z.number().min(5).max(999),
  description: z.string().optional(),
  allowExplicit: z.boolean().optional(),
  referenceArtists: z.array(z.string()).optional()
});

// --- Curation Status Schema ---

export const CurationDiffSchema = z.object({
  added: z.array(z.object({ uri: z.string(), name: z.string(), artist: z.string() })),
  removed: z.array(
    z.object({
      uri: z.string(),
      name: z.string(),
      artist: z.string(),
      reason: z.enum(['duplicate', 'expired', 'artist_limit', 'size_limit', 'other']).optional()
    })
  ),
  keptMandatory: z
    .array(z.object({ uri: z.string(), name: z.string(), artist: z.string() }))
    .optional(),
  stats: z
    .object({
      target: z.number(),
      final: z.number(),
      success: z.boolean()
    })
    .optional()
});

export const ActivityMetadataSchema = z.object({
  playlistId: z.string(),
  playlistName: z.string(),
  addedCount: z.number().default(0),
  removedCount: z.number().default(0),
  aiTracksAdded: z.number().default(0),
  duplicatesRemoved: z.number().default(0),
  expiredRemoved: z.number().default(0),
  artistLimitRemoved: z.number().default(0),
  sizeLimitRemoved: z.number().default(0),
  finalCount: z.number().default(0),
  dryRun: z.boolean().default(false),
  error: z.string().optional(),
  progress: z.number().default(0),
  step: z.string().optional(),
  triggeredBy: z.string().optional(),
  state: z.enum(['idle', 'running', 'completed', 'error']).default('idle'),
  diff: CurationDiffSchema.optional()
});

export const ActivityLogSchema = z.object({
  id: z.string().optional(),
  timestamp: z.any().optional(), // Firestore Timestamp
  type: z.string().optional(),
  deleted: z.boolean().default(false).optional(),
  metadata: ActivityMetadataSchema
});

export const CurationStatusSchema = z.object({
  state: z.enum(['idle', 'running', 'completed', 'error']).default('idle'),
  progress: z.number().min(0).max(100).default(0),
  step: z.string().optional(),
  lastUpdated: z.string().optional(),
  diff: CurationDiffSchema.optional(),
  isDryRun: z.boolean().optional()
});

// --- Main Schema ---

export const PlaylistConfigSchema = z.object({
  id: z
    .string()
    .min(1, 'you have to select the target playlist')
    .startsWith('spotify:playlist:', { message: 'Must be a valid Spotify Playlist URI' }),
  name: z.string(), // Name should be required as well
  enabled: z.boolean().default(true),
  imageUrl: z.string().optional().nullable(),
  ownerId: z.string().min(1, 'Owner ID is required'),
  settings: PlaylistSettingsSchema.default({
    targetTotalTracks: 20
  }),
  mandatoryTracks: z.array(MandatoryTrackSchema).default([]),
  aiGeneration: AiGenerationConfigSchema.default({
    enabled: true,
    tracksToAdd: 10,
    model: 'gemini-2.5-flash',
    temperature: 0.7
  }),
  curationRules: CurationRulesSchema.default({
    maxTrackAgeDays: 30,
    maxTracksPerArtist: 2,
    removeDuplicates: true,
    shuffleAtEnd: true,
    sizeLimitStrategy: 'drop_random'
  })
});

// --- User Schema ---

export const SpotifyProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  product: z.string(),
  linkedAt: z.date(),
  status: z.enum(['active', 'invalid']).default('active'),
  authError: z.string().optional()
});

export const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  createdAt: z.date(),
  lastLoginAt: z.date(),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  spotifyProfile: SpotifyProfileSchema.optional().nullable()
});

// --- Playlist Metrics Schema ---

export const PlaylistMetricsSchema = z.object({
  followers: z.number(),
  tracks: z.number(),
  lastUpdated: z.string() // ISO 8601 timestamp
});

export type SpotifyProfile = z.infer<typeof SpotifyProfileSchema>;
export type UserProfile = z.infer<typeof UserSchema>;
export type PlaylistMetrics = z.infer<typeof PlaylistMetricsSchema>;

// Infer TS types from Zod schemas
export type PlaylistConfig = z.infer<typeof PlaylistConfigSchema>;
export type MandatoryTrack = z.infer<typeof MandatoryTrackSchema>;
export type AiGenerationConfig = z.infer<typeof AiGenerationConfigSchema>;
export type CurationRules = z.infer<typeof CurationRulesSchema>;
export type PlaylistSettings = z.infer<typeof PlaylistSettingsSchema>;
export type PositionRange = z.infer<typeof PositionRangeSchema>;
export type CurationStatus = z.infer<typeof CurationStatusSchema>;
export type CurationDiff = z.infer<typeof CurationDiffSchema>;
export type ActivityMetadata = z.infer<typeof ActivityMetadataSchema>;
export type ActivityLog = z.infer<typeof ActivityLogSchema>;

// --- Orchestration Response Schema ---

export const OrchestrationResultSchema = z.object({
  message: z.string(),
  results: z.array(
    z.object({
      name: z.string(),
      status: z.enum(['success', 'error']),
      error: z.string().optional()
    })
  )
});

// --- Estimation Result ---

export const CurationEstimateSchema = z.object({
  currentTracks: z.number(),
  duplicatesToRemove: z.number(),
  agedOutTracks: z.number(),
  artistLimitRemoved: z.number(),
  sizeLimitRemoved: z.number(),
  mandatoryToAdd: z.number(),
  aiTracksToAdd: z.number(),
  predictedFinal: z.number()
});

export type CurationEstimate = z.infer<typeof CurationEstimateSchema>;

export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>;
