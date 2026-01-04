import { z } from "zod";

// Zod schema for PositionRange
const PositionRangeSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
});

// Zod schema for MandatoryTrack
const MandatoryTrackSchema = z.object({
  uri: z
    .string()
    .regex(/^spotify:track:[a-zA-Z0-9]{22}$/, "Invalid Spotify Track URI"),
  positionRange: PositionRangeSchema,
  note: z.string().optional(),
});

// Zod schema for AiGenerationConfig
const AiGenerationConfigSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  model: z.string().default("gemini-2.5-flash"),
  temperature: z.number().default(0.7),
  overfetchRatio: z.number().positive().default(2.0),
  isInstrumentalOnly: z.boolean().optional(),
});

// Zod schema for CurationRules
const CurationRulesSchema = z.object({
  maxTrackAgeDays: z.number().int().nonnegative(),
  removeDuplicates: z.boolean(),
});

// Zod schema for PlaylistConfig
export const PlaylistConfigSchema = z.object({
  id: z
    .string()
    .regex(
      /^spotify:playlist:[a-zA-Z0-9]{22}$/,
      "Invalid Spotify Playlist URI",
    ),
  name: z.string().min(1),
  enabled: z.boolean(),
  imageUrl: z.string().url().optional(),
  owner: z.string().optional(),
  dryRun: z.boolean().optional().default(false),
  settings: z.object({
    targetTotalTracks: z.number().int().positive(),
    description: z.string().optional(),
    allowExplicit: z.boolean().optional(),
    referenceArtists: z.array(z.string()).optional(),
  }),
  aiGeneration: AiGenerationConfigSchema,
  curationRules: CurationRulesSchema,
  mandatoryTracks: z.array(MandatoryTrackSchema),
});
