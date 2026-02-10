/**
 * Tracks all meaningful events in the playlist curation lifecycle
 */
import { ActivityMetadata } from '@smart-spotify-curator/shared';

export interface ActivityLogEntry {
  action:
    | 'curation_completed'
    | 'curation_failed'
    | 'curation_started'
    | 'duplicates_removed'
    | 'health_check'
    | 'manual_run'
    | 'playlist_created'
    | 'playlist_deleted'
    | 'playlist_updated'
    | 'spotify_connected'
    | 'spotify_disconnected'
    | 'tracks_added'
    | 'tracks_removed';
  id: string;
  message: string;
  metadata?: ActivityMetadata;
  timestamp: string; // ISO 8601
  type: 'error' | 'info' | 'success' | 'warning';
}

/**
 * Helper to create valid ActivityMetadata for mocks
 */
const createMockMetadata = (overrides: Partial<ActivityMetadata>): ActivityMetadata => ({
  addedCount: 0,
  aiTracksAdded: 0,
  artistLimitRemoved: 0,

  duplicatesRemoved: 0,
  expiredRemoved: 0,
  finalCount: 0,
  playlistId: 'unknown',
  playlistName: 'Unknown',
  progress: 0,
  removedCount: 0,
  sizeLimitRemoved: 0,
  state: 'idle',
  ...overrides
});

/**
 * Mock Activity Data for Debug Mode
 */
export const MOCK_ACTIVITIES: ActivityLogEntry[] = [
  {
    action: 'curation_completed',
    id: 'activity-1',
    message: 'Successfully curated "🎧 Chill Vibes"',
    metadata: createMockMetadata({
      addedCount: 12,
      aiTracksAdded: 10,
      duplicatesRemoved: 2,
      finalCount: 50,
      playlistId: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      playlistName: '🎧 Chill Vibes',
      progress: 100,
      removedCount: 3,
      state: 'completed',
      triggeredBy: 'Developer Admin'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    type: 'success'
  },
  {
    action: 'duplicates_removed',
    id: 'activity-2',
    message: 'Removed 5 duplicate tracks from "💪 Workout Energy"',
    metadata: createMockMetadata({
      duplicatesRemoved: 5,
      finalCount: 30,
      playlistId: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
      playlistName: '💪 Workout Energy',
      progress: 100,
      state: 'completed',
      triggeredBy: 'System Auto'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    type: 'info'
  },
  {
    action: 'tracks_added',
    id: 'activity-3',
    message: 'Added 8 new tracks to "☕ Morning Coffee"',
    metadata: createMockMetadata({
      addedCount: 8,
      finalCount: 25,
      playlistId: 'spotify:playlist:37i9dQZF1DX1s9knjP51Oa',
      playlistName: '☕ Morning Coffee',
      progress: 100,
      state: 'completed',
      triggeredBy: 'Tommaso'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    type: 'success'
  },
  {
    action: 'health_check',
    id: 'activity-4',
    message: 'Health check found issues in "🎉 Party Mix"',
    metadata: createMockMetadata({
      duplicatesRemoved: 3,
      finalCount: 75,
      playlistId: 'spotify:playlist:37i9dQZF1DXa2PvUpywmrr',
      playlistName: '🎉 Party Mix',
      progress: 100,
      state: 'completed',
      triggeredBy: 'Health Monitor'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    type: 'warning'
  },
  {
    action: 'playlist_created',
    id: 'activity-5',
    message: 'Created new playlist "🌙 Late Night Jazz"',
    metadata: createMockMetadata({
      finalCount: 0,
      playlistId: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
      playlistName: '🌙 Late Night Jazz',
      progress: 100,
      state: 'completed',
      triggeredBy: 'Developer Admin'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    type: 'success'
  },
  {
    action: 'curation_failed',
    id: 'activity-6',
    message: 'Failed to curate "🎉 Party Mix"',
    metadata: createMockMetadata({
      error: 'Spotify API rate limit exceeded',
      playlistId: 'spotify:playlist:37i9dQZF1DXa2PvUpywmrr',
      playlistName: '🎉 Party Mix',
      state: 'error',
      triggeredBy: 'System Auto'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    type: 'error'
  },
  {
    action: 'manual_run',
    id: 'activity-7',
    message: 'Manually triggered curation for "💪 Workout Energy"',
    metadata: createMockMetadata({
      addedCount: 5,
      playlistId: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
      playlistName: '💪 Workout Energy',
      progress: 100,
      state: 'completed',
      triggeredBy: 'Tommaso'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    type: 'success'
  },
  {
    action: 'tracks_removed',
    id: 'activity-8',
    message: 'Removed 4 outdated tracks from "🎧 Chill Vibes"',
    metadata: createMockMetadata({
      finalCount: 50,
      playlistId: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      playlistName: '🎧 Chill Vibes',
      progress: 100,
      removedCount: 4,
      state: 'completed',
      triggeredBy: 'Developer Admin'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    type: 'info'
  },
  {
    action: 'spotify_connected',
    id: 'activity-9',
    message: 'Connected Spotify account',
    metadata: createMockMetadata({
      playlistId: 'none',
      playlistName: 'Account',
      progress: 100,
      state: 'completed'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    type: 'success'
  },
  {
    action: 'curation_completed',
    id: 'activity-10',
    message: 'Successfully curated "🌙 Late Night Jazz"',
    metadata: createMockMetadata({
      addedCount: 15,
      duplicatesRemoved: 0,
      finalCount: 40,
      playlistId: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
      playlistName: '🌙 Late Night Jazz',
      progress: 100,
      removedCount: 0,
      state: 'completed',
      triggeredBy: 'Scheduler'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    type: 'success'
  },
  {
    action: 'playlist_updated',
    id: 'activity-11',
    message: 'Updated configuration for "☕ Morning Coffee"',
    metadata: createMockMetadata({
      playlistId: 'spotify:playlist:37i9dQZF1DX1s9knjP51Oa',
      playlistName: '☕ Morning Coffee',
      progress: 100,
      state: 'completed',
      triggeredBy: 'Tommaso'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // 1.25 days ago
    type: 'info'
  },
  {
    action: 'curation_started',
    id: 'activity-12',
    message: 'Started curation for "💪 Workout Energy"',
    metadata: createMockMetadata({
      playlistId: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
      playlistName: '💪 Workout Energy',
      progress: 10,
      state: 'running',
      triggeredBy: 'Developer Admin'
    }),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    type: 'warning'
  }
];
