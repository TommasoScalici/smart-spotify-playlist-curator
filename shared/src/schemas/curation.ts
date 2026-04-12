import { z } from 'zod';

import { BaseTrackSchema, TrackDiffSchema } from './tracks';

export const CurationDiffSchema = z.object({
  added: z.array(TrackDiffSchema),
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

export type CurationDiff = z.infer<typeof CurationDiffSchema>;

export const CurationStatusSchema = z.object({
  diff: CurationDiffSchema.optional(),
  lastUpdated: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  state: z.enum(['idle', 'running', 'completed', 'error']).default('idle'),
  step: z.string().optional()
});

export type CurationStatus = z.infer<typeof CurationStatusSchema>;

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

export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>;

export const CurationEstimateSchema = z.object({
  added: z
    .array(BaseTrackSchema.extend({ source: z.enum(['ai', 'mandatory']).optional() }))
    .optional(),
  agedOutTracks: z.number(),
  aiTracksToAdd: z.number(),
  artistLimitRemoved: z.number(),
  currentTracks: z.number(),
  duplicatesToRemove: z.number(),
  hasEpisodes: z.boolean().optional(),
  hasLocalTracks: z.boolean().optional(),
  mandatoryToAdd: z.number(),
  planId: z.string().optional(),
  predictedFinal: z.number(),
  removed: z.array(TrackDiffSchema).optional(),
  sizeLimitRemoved: z.number(),
  unsupportedFormatTracks: z.number().optional()
});

export type CurationEstimate = z.infer<typeof CurationEstimateSchema>;

export const TriggerCurationRequestSchema = z.object({
  planId: z.string().optional(),
  playlistId: z.string().min(1, 'Playlist ID is required')
});

export type TriggerCurationRequest = z.infer<typeof TriggerCurationRequestSchema>;

export const EstimateCurationRequestSchema = z.object({
  playlistId: z.string().min(1, 'Playlist ID is required')
});

export type EstimateCurationRequest = z.infer<typeof EstimateCurationRequestSchema>;
