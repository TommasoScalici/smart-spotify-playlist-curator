import { z } from 'zod';

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
  positionRange: PositionRangeSchema,
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
  removeDuplicates: z.boolean().default(true)
});

export const PlaylistSettingsSchema = z.object({
  targetTotalTracks: z.number().min(5).max(100),
  description: z.string().optional(),
  allowExplicit: z.boolean().optional(),
  referenceArtists: z.array(z.string()).optional()
});

// --- Curation Status Schema ---

export const CurationDiffSchema = z.object({
  added: z.array(z.object({ uri: z.string(), name: z.string(), artist: z.string() })),
  removed: z.array(z.object({ uri: z.string(), name: z.string(), artist: z.string() }))
});

export const ActivityMetadataSchema = z.object({
  playlistId: z.string().optional(),
  playlistName: z.string().optional(),
  addedCount: z.number().optional(),
  removedCount: z.number().optional(),
  aiTracksAdded: z.number().optional(),
  duplicatesRemoved: z.number().optional(),
  expiredRemoved: z.number().optional(),
  finalCount: z.number().optional(),
  dryRun: z.boolean().optional(),
  error: z.string().optional()
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
  name: z.string().optional(),
  enabled: z.boolean().default(true),
  imageUrl: z.string().optional().nullable(),
  ownerId: z.string().optional(),
  dryRun: z.boolean().optional(),
  mandate: z.enum(['exact', 'flexible']).optional(),
  settings: PlaylistSettingsSchema,
  mandatoryTracks: z.array(MandatoryTrackSchema),
  aiGeneration: AiGenerationConfigSchema,
  curationRules: CurationRulesSchema,
  curationStatus: CurationStatusSchema.optional()
});

// --- User Schema ---

export const SpotifyProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  email: z.email(),
  avatarUrl: z.url().nullable(),
  product: z.string(),
  linkedAt: z.date(),
  status: z.enum(['active', 'invalid']).default('active'),
  authError: z.string().optional()
});

export const UserSchema = z.object({
  uid: z.string(),
  email: z.email(),
  displayName: z.string().optional(),
  photoURL: z.url().optional(),
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

export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>;
