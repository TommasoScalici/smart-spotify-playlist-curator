import { z } from 'zod';

export const PlaylistMetricsSchema = z.object({
  description: z.string().optional(),
  followers: z.number(),
  imageUrl: z.string().url().optional().nullable(),
  lastUpdated: z.string(), // ISO 8601 timestamp
  owner: z.string().optional(),
  tracks: z.number()
});

export type PlaylistMetrics = z.infer<typeof PlaylistMetricsSchema>;
