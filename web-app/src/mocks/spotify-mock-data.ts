import { PlaylistConfig } from '@smart-spotify-curator/shared';

/**
 * Mock Spotify Profile for Debug Mode
 */
export const MOCK_SPOTIFY_PROFILE = {
  displayName: 'Debug Spotify User',
  email: 'debug-spotify@example.com',
  avatarUrl: 'https://ui-avatars.com/api/?name=Debug+Spotify&background=1DB954&color=fff'
};

/**
 * Mock Playlist Configurations for Debug Mode
 * Provides a variety of states for UI testing
 */
export const MOCK_PLAYLISTS: (PlaylistConfig & { _docId: string })[] = [
  {
    _docId: 'mock-playlist-1',
    id: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
    name: '🎧 Chill Vibes',
    enabled: true,
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84a5c545e5c0e0a0e0a0e0a0e0',
    ownerId: 'debug-user-123',
    settings: {
      targetTotalTracks: 50,
      description: 'Relaxing instrumental music perfect for focus and productivity',
      allowExplicit: false,
      referenceArtists: ['Lofi Girl', 'Chillhop Music']
    },
    mandatoryTracks: [
      {
        uri: 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp',
        name: 'Lofi Study Beat #1',
        artist: 'Chill Beats',
        positionRange: { min: 1, max: 5 }
      }
    ],
    aiGeneration: {
      enabled: true,
      tracksToAdd: 10,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      isInstrumentalOnly: true
    },
    curationRules: {
      maxTrackAgeDays: 30,
      removeDuplicates: true,
      maxTracksPerArtist: 2,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    }
  },
  {
    _docId: 'mock-playlist-2',
    id: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
    name: '💪 Workout Energy',
    enabled: true,
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84b1b1b1b1b1b1b1b1b1b1b1b1',
    ownerId: 'debug-user-123',
    settings: {
      targetTotalTracks: 30,
      description: 'High-energy tracks to power through intense workouts and cardio sessions',
      allowExplicit: true,
      referenceArtists: ['The Prodigy', 'Pendulum', 'Skrillex']
    },
    mandatoryTracks: [],
    aiGeneration: {
      enabled: true,
      tracksToAdd: 5,
      model: 'gemini-2.5-flash',
      temperature: 0.8,
      isInstrumentalOnly: false
    },
    curationRules: {
      maxTrackAgeDays: 60,
      removeDuplicates: true,
      maxTracksPerArtist: 2,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    }
  },
  {
    _docId: 'mock-playlist-3',
    id: 'spotify:playlist:37i9dQZF1DXa2PvUpywmrr',
    name: '🎉 Party Mix',
    enabled: false,
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84c2c2c2c2c2c2c2c2c2c2c2c2',
    ownerId: 'debug-user-123',
    settings: {
      targetTotalTracks: 75,
      description: 'Upbeat party anthems and dance hits to keep the energy high',
      allowExplicit: true,
      referenceArtists: ['Calvin Harris', 'David Guetta', 'Tiësto']
    },
    mandatoryTracks: [
      {
        uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
        name: 'Party Starter',
        artist: 'DJ Hype',
        positionRange: { min: 1, max: 1 }
      },
      {
        uri: 'spotify:track:1301WleyT98MSxVHPZCA6M',
        name: 'Dance Floor Anthem',
        artist: 'Beat Masters',
        positionRange: { min: 10, max: 15 }
      }
    ],
    aiGeneration: {
      enabled: true,
      tracksToAdd: 15,
      model: 'gemini-2.5-flash',
      temperature: 0.9,
      isInstrumentalOnly: false
    },
    curationRules: {
      maxTrackAgeDays: 90,
      removeDuplicates: true,
      maxTracksPerArtist: 2,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    }
  },
  {
    _docId: 'mock-playlist-4',
    id: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
    name: '🌙 Late Night Jazz',
    enabled: true,
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84d3d3d3d3d3d3d3d3d3d3d3d3',
    ownerId: 'debug-user-123',
    settings: {
      targetTotalTracks: 40,
      description: 'Smooth jazz and neo-soul for late night relaxation',
      allowExplicit: false,
      referenceArtists: ['Miles Davis', 'John Coltrane', 'Billie Holiday']
    },
    mandatoryTracks: [],
    aiGeneration: {
      enabled: true,
      tracksToAdd: 8,
      model: 'gemini-2.5-flash',
      temperature: 0.6,
      isInstrumentalOnly: true
    },
    curationRules: {
      maxTrackAgeDays: 365,
      removeDuplicates: true,
      maxTracksPerArtist: 2,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    }
  },
  {
    _docId: 'mock-playlist-5',
    id: 'spotify:playlist:37i9dQZF1DX1s9knjP51Oa',
    name: '☕ Morning Coffee',
    enabled: true,
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84e4e4e4e4e4e4e4e4e4e4e4e4',
    ownerId: 'debug-user-123',
    settings: {
      targetTotalTracks: 25,
      description: 'Gentle acoustic and indie folk to ease into the morning',
      allowExplicit: false,
      referenceArtists: ['Bon Iver', 'Iron & Wine', 'Fleet Foxes']
    },
    mandatoryTracks: [
      {
        uri: 'spotify:track:5ygDXis42ncn6kYG14lEVG',
        name: 'Morning Brew',
        artist: 'Acoustic Collective',
        positionRange: { min: 1, max: 3 }
      }
    ],
    aiGeneration: {
      enabled: true,
      tracksToAdd: 12,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      isInstrumentalOnly: false
    },
    curationRules: {
      maxTrackAgeDays: 45,
      removeDuplicates: true,
      maxTracksPerArtist: 2,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    }
  }
];
