import { z } from 'zod';

export const TrackInfoSchema = z.object({
  addedAt: z.string(),
  album: z.string(),
  artist: z.string(),
  imageUrl: z.string().optional(),
  isEpisode: z.boolean().optional(),
  isLocal: z.boolean().optional(),
  name: z.string(),
  popularity: z.number().min(0).max(100).optional(),
  uri: z.string()
});

export type TrackInfo = z.infer<typeof TrackInfoSchema>;

export const PositionRangeSchema = z
  .object({
    max: z.number().min(1),
    min: z.number().min(1)
  })
  .refine((data) => data.min <= data.max, {
    message: 'Min position must be less than or equal to max position',
    path: ['min']
  });

export type PositionRange = z.infer<typeof PositionRangeSchema>;

export const MandatoryTrackSchema = z.object({
  artist: z.string().optional(),
  comment: z.string().optional(),
  imageUrl: z.string().optional(),
  name: z.string().optional(),
  note: z.string().optional(),
  positionRange: PositionRangeSchema.default({ max: 1, min: 1 }),
  uri: z.string().startsWith('spotify:track:', { message: 'Must be a valid Spotify Track URI' })
});

export type MandatoryTrack = z.infer<typeof MandatoryTrackSchema>;

export const BaseTrackSchema = z.object({
  artist: z.string(),
  name: z.string(),
  uri: z.string()
});

export type BaseTrack = z.infer<typeof BaseTrackSchema>;

export const TrackDiffSchema = BaseTrackSchema.extend({
  reason: z
    .enum([
      'duplicate',
      'expired',
      'artist_limit',
      'size_limit',
      'unsupported_format',
      'other',
      'ai_suggestion',
      'vip_readd'
    ])
    .optional()
});

export type TrackDiff = z.infer<typeof TrackDiffSchema>;
