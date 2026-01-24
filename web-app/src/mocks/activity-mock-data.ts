/**
 * Tracks all meaningful events in the playlist curation lifecycle
 */
import { ActivityMetadata } from '@smart-spotify-curator/shared';

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  type: 'success' | 'error' | 'warning' | 'info';
  action:
    | 'playlist_created'
    | 'playlist_updated'
    | 'playlist_deleted'
    | 'curation_started'
    | 'curation_completed'
    | 'curation_failed'
    | 'tracks_added'
    | 'tracks_removed'
    | 'duplicates_removed'
    | 'health_check'
    | 'spotify_connected'
    | 'spotify_disconnected'
    | 'manual_run';
  message: string;
  metadata?: ActivityMetadata;
}

/**
 * Mock Activity Data for Debug Mode
 */
export const MOCK_ACTIVITIES: ActivityLogEntry[] = [
  {
    id: 'activity-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    type: 'success',
    action: 'curation_completed',
    message: 'Successfully curated "🎧 Chill Vibes"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      playlistName: '🎧 Chill Vibes',
      addedCount: 12,
      removedCount: 3,
      duplicatesRemoved: 2,
      finalCount: 50,
      aiTracksAdded: 10,
      triggeredBy: 'Developer Admin'
    }
  },
  {
    id: 'activity-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    type: 'info',
    action: 'duplicates_removed',
    message: 'Removed 5 duplicate tracks from "💪 Workout Energy"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
      playlistName: '💪 Workout Energy',
      duplicatesRemoved: 5,
      finalCount: 30,
      triggeredBy: 'System Auto'
    }
  },
  {
    id: 'activity-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    type: 'success',
    action: 'tracks_added',
    message: 'Added 8 new tracks to "☕ Morning Coffee"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DX1s9knjP51Oa',
      playlistName: '☕ Morning Coffee',
      addedCount: 8,
      finalCount: 25,
      triggeredBy: 'Tommaso'
    }
  },
  {
    id: 'activity-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    type: 'warning',
    action: 'health_check',
    message: 'Health check found issues in "🎉 Party Mix"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DXa2PvUpywmrr',
      playlistName: '🎉 Party Mix',
      duplicatesRemoved: 3,
      finalCount: 75,
      triggeredBy: 'Health Monitor'
    }
  },
  {
    id: 'activity-5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    type: 'success',
    action: 'playlist_created',
    message: 'Created new playlist "🌙 Late Night Jazz"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
      playlistName: '🌙 Late Night Jazz',
      finalCount: 0,
      triggeredBy: 'Developer Admin'
    }
  },
  {
    id: 'activity-6',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    type: 'error',
    action: 'curation_failed',
    message: 'Failed to curate "🎉 Party Mix"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DXa2PvUpywmrr',
      playlistName: '🎉 Party Mix',
      error: 'Spotify API rate limit exceeded',
      triggeredBy: 'System Auto'
    }
  },
  {
    id: 'activity-7',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    type: 'success',
    action: 'manual_run',
    message: 'Manually triggered curation for "💪 Workout Energy"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
      playlistName: '💪 Workout Energy',
      addedCount: 5,
      triggeredBy: 'Tommaso'
    }
  },
  {
    id: 'activity-8',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    type: 'info',
    action: 'tracks_removed',
    message: 'Removed 4 outdated tracks from "🎧 Chill Vibes"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
      playlistName: '🎧 Chill Vibes',
      removedCount: 4,
      finalCount: 50,
      triggeredBy: 'Developer Admin'
    }
  },
  {
    id: 'activity-9',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    type: 'success',
    action: 'spotify_connected',
    message: 'Connected Spotify account',
    metadata: {}
  },
  {
    id: 'activity-10',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    type: 'success',
    action: 'curation_completed',
    message: 'Successfully curated "🌙 Late Night Jazz"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
      playlistName: '🌙 Late Night Jazz',
      addedCount: 15,
      removedCount: 0,
      duplicatesRemoved: 0,
      finalCount: 40,
      triggeredBy: 'Scheduler'
    }
  },
  {
    id: 'activity-11',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // 1.25 days ago
    type: 'info',
    action: 'playlist_updated',
    message: 'Updated configuration for "☕ Morning Coffee"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DX1s9knjP51Oa',
      playlistName: '☕ Morning Coffee',
      triggeredBy: 'Tommaso'
    }
  },
  {
    id: 'activity-12',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    type: 'warning',
    action: 'curation_started',
    message: 'Started curation for "💪 Workout Energy"',
    metadata: {
      playlistId: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
      playlistName: '💪 Workout Energy',
      triggeredBy: 'Developer Admin'
    }
  }
];
