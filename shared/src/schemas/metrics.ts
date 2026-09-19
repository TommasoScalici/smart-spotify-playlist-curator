import { z } from 'zod';

export const PlaylistMetricsSchema = z.object({
  description: z.string().optional(),
  followers: z.number(),
  imageUrl: z.string().url().optional().nullable(),
  lastUpdated: z.string(), // ISO 8601 timestamp
  name: z.string().optional(),
  owner: z.string().optional(),
  tracks: z.number()
});

export type PlaylistMetrics = z.infer<typeof PlaylistMetricsSchema>;

export const GetPlaylistMetricsRequestSchema = z.object({
  playlistId: z
    .string()
    .startsWith('spotify:playlist:', { message: 'Must be a valid Spotify Playlist URI' })
});

export type GetPlaylistMetricsRequest = z.infer<typeof GetPlaylistMetricsRequestSchema>;
