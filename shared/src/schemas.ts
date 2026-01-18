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
  model: z.string().default('gemini-1.5-flash'), // Defaulting to latest efficient model
  prompt: z.string().min(10, { message: 'Prompt must be at least 10 characters' }),
  temperature: z.number().min(0).max(1).default(0.7),
  overfetchRatio: z.number().min(1).max(5).default(2.0),
  isInstrumentalOnly: z.boolean().default(false).optional()
});

export const CurationRulesSchema = z.object({
  maxTrackAgeDays: z.number().min(1).default(30),
  removeDuplicates: z.boolean().default(true)
});

export const PlaylistSettingsSchema = z.object({
  targetTotalTracks: z.number().min(5).max(100),
  description: z.string().optional(),
  allowExplicit: z.boolean().optional(),
  referenceArtists: z.array(z.string()).optional()
});

// --- Main Schema ---

export const PlaylistConfigSchema = z.object({
  id: z
    .string()
    .startsWith('spotify:playlist:', { message: 'Must be a valid Spotify Playlist URI' }),
  name: z.string().min(3, { message: 'Name is too short' }),
  enabled: z.boolean().default(true),
  imageUrl: z.url().optional(),
  ownerId: z.string().min(1, { message: 'Owner ID is required' }), // Added for Multi-Tenancy
  owner: z.string().optional(), // Legacy field, consider removing later if redundant
  dryRun: z.boolean().optional(),
  mandate: z.enum(['exact', 'flexible']).optional(),
  settings: PlaylistSettingsSchema,
  mandatoryTracks: z.array(MandatoryTrackSchema),
  aiGeneration: AiGenerationConfigSchema,
  curationRules: CurationRulesSchema
});

// --- User Schema ---

export const UserSchema = z.object({
  uid: z.string(),
  email: z.email(),
  displayName: z.string().optional(),
  photoURL: z.url().optional(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime(),
  theme: z.enum(['light', 'dark', 'system']).default('system')
});

export type UserProfile = z.infer<typeof UserSchema>;

// Infer TS types from Zod schemas
export type PlaylistConfig = z.infer<typeof PlaylistConfigSchema>;
export type MandatoryTrack = z.infer<typeof MandatoryTrackSchema>;
export type AiGenerationConfig = z.infer<typeof AiGenerationConfigSchema>;
export type CurationRules = z.infer<typeof CurationRulesSchema>;
export type PlaylistSettings = z.infer<typeof PlaylistSettingsSchema>;
export type PositionRange = z.infer<typeof PositionRangeSchema>;
