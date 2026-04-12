import { z } from 'zod';

import { CurationDiffSchema } from './curation';

export const ActivityMetadataSchema = z.object({
  addedCount: z.number().default(0),
  aiTracksAdded: z.number().default(0),
  artistLimitRemoved: z.number().default(0),
  diff: CurationDiffSchema.optional(),
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

export type ActivityMetadata = z.infer<typeof ActivityMetadataSchema>;

export const ActivityLogSchema = z.object({
  deleted: z.boolean().default(false).optional(),
  id: z.string().optional(),
  metadata: ActivityMetadataSchema,
  timestamp: z.any().optional(), // Firestore Timestamp
  type: z.string().optional()
});

export type ActivityLog = z.infer<typeof ActivityLogSchema>;
