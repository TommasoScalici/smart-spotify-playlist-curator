import { z } from 'zod';

import { SearchResultSchema } from './search';
import { MandatoryTrackSchema } from './tracks';

export const AiGenerationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  isInstrumentalOnly: z.boolean().default(false).optional(),
  model: z.string().default('gemini-2.5-flash'),
  temperature: z.number().min(0).max(1).default(0.7),
  tracksToAdd: z.number().min(0).max(50).default(10)
});

export type AiGenerationConfig = z.infer<typeof AiGenerationConfigSchema>;

export const CurationRulesSchema = z.object({
  maxTrackAgeDays: z.number().min(1).default(30),
  maxTracksPerArtist: z.number().min(1).default(2),
  removeDuplicates: z.boolean().default(true),
  shuffleAtEnd: z.boolean().default(true),
  sizeLimitStrategy: z
    .enum(['drop_newest', 'drop_oldest', 'drop_random', 'drop_most_popular', 'drop_least_popular'])
    .default('drop_random')
});

export type CurationRules = z.infer<typeof CurationRulesSchema>;

export const PlaylistSettingsSchema = z.object({
  allowExplicit: z.boolean().optional(),
  description: z.string().optional(),
  referenceArtists: z.array(SearchResultSchema).default([]),
  targetTotalTracks: z.number().min(5).max(999)
});

export type PlaylistSettings = z.infer<typeof PlaylistSettingsSchema>;

export const PlaylistConfigSchema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    const sum = (data.aiGeneration?.tracksToAdd || 0) + (data.mandatoryTracks?.length || 0);
    if (data.enabled && data.settings.targetTotalTracks < sum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Target tracks (${data.settings.targetTotalTracks}) must be at least the sum of AI tracks (${data.aiGeneration?.tracksToAdd || 0}) and VIPs (${data.mandatoryTracks?.length || 0})`,
        path: ['settings', 'targetTotalTracks']
      });
    }
  });

export type PlaylistConfig = z.infer<typeof PlaylistConfigSchema>;
