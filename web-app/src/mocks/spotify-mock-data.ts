import { PlaylistConfig } from '@smart-spotify-curator/shared';

/**
 * Mock Spotify Profile for Debug Mode
 */
export const MOCK_SPOTIFY_PROFILE = {
  avatarUrl: 'https://ui-avatars.com/api/?name=Debug+Spotify&background=1DB954&color=fff',
  displayName: 'Debug Spotify User',
  email: 'debug-spotify@example.com'
};

/**
 * Mock Playlist Configurations for Debug Mode
 * Provides a variety of states for UI testing
 */
export const MOCK_PLAYLISTS: ({ _docId: string } & PlaylistConfig)[] = [
  {
    _docId: 'mock-playlist-1',
    aiGeneration: {
      enabled: true,
      isInstrumentalOnly: true,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      tracksToAdd: 10
    },
    curationRules: {
      maxTrackAgeDays: 30,
      maxTracksPerArtist: 2,
      removeDuplicates: true,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84a5c545e5c0e0a0e0a0e0a0e0',
    mandatoryTracks: [
      {
        artist: 'Chill Beats',
        name: 'Lofi Study Beat #1',
        positionRange: { max: 5, min: 1 },
        uri: 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp'
      }
    ],
    name: '🎧 Chill Vibes',
    ownerId: 'debug-user-123',
    settings: {
      allowExplicit: false,
      description: 'Relaxing instrumental music perfect for focus and productivity',
      referenceArtists: [
        { name: 'Lofi Girl', type: 'artist', uri: 'spotify:artist:lofi1' },
        { name: 'Chillhop Music', type: 'artist', uri: 'spotify:artist:chill1' }
      ],
      targetTotalTracks: 50
    }
  },
  {
    _docId: 'mock-playlist-2',
    aiGeneration: {
      enabled: true,
      isInstrumentalOnly: false,
      model: 'gemini-2.5-flash',
      temperature: 0.8,
      tracksToAdd: 5
    },
    curationRules: {
      maxTrackAgeDays: 60,
      maxTracksPerArtist: 2,
      removeDuplicates: true,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84b1b1b1b1b1b1b1b1b1b1b1b1',
    mandatoryTracks: [],
    name: '💪 Workout Energy',
    ownerId: 'debug-user-123',
    settings: {
      allowExplicit: true,
      description: 'High-energy tracks to power through intense workouts and cardio sessions',
      referenceArtists: [
        { name: 'The Prodigy', type: 'artist', uri: 'spotify:artist:prod1' },
        { name: 'Pendulum', type: 'artist', uri: 'spotify:artist:pend1' },
        { name: 'Skrillex', type: 'artist', uri: 'spotify:artist:skril1' }
      ],
      targetTotalTracks: 30
    }
  },
  {
    _docId: 'mock-playlist-3',
    aiGeneration: {
      enabled: true,
      isInstrumentalOnly: false,
      model: 'gemini-2.5-flash',
      temperature: 0.9,
      tracksToAdd: 15
    },
    curationRules: {
      maxTrackAgeDays: 90,
      maxTracksPerArtist: 2,
      removeDuplicates: true,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: false,
    id: 'spotify:playlist:37i9dQZF1DXa2PvUpywmrr',
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84c2c2c2c2c2c2c2c2c2c2c2c2',
    mandatoryTracks: [
      {
        artist: 'DJ Hype',
        name: 'Party Starter',
        positionRange: { max: 1, min: 1 },
        uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b'
      },
      {
        artist: 'Beat Masters',
        name: 'Dance Floor Anthem',
        positionRange: { max: 15, min: 10 },
        uri: 'spotify:track:1301WleyT98MSxVHPZCA6M'
      }
    ],
    name: '🎉 Party Mix',
    ownerId: 'debug-user-123',
    settings: {
      allowExplicit: true,
      description: 'Upbeat party anthems and dance hits to keep the energy high',
      referenceArtists: [
        { name: 'Calvin Harris', type: 'artist', uri: 'spotify:artist:cal1' },
        { name: 'David Guetta', type: 'artist', uri: 'spotify:artist:dav1' },
        { name: 'Tiësto', type: 'artist', uri: 'spotify:artist:tiej1' }
      ],
      targetTotalTracks: 75
    }
  },
  {
    _docId: 'mock-playlist-4',
    aiGeneration: {
      enabled: true,
      isInstrumentalOnly: true,
      model: 'gemini-2.5-flash',
      temperature: 0.6,
      tracksToAdd: 8
    },
    curationRules: {
      maxTrackAgeDays: 365,
      maxTracksPerArtist: 2,
      removeDuplicates: true,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO',
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84d3d3d3d3d3d3d3d3d3d3d3d3',
    mandatoryTracks: [],
    name: '🌙 Late Night Jazz',
    ownerId: 'debug-user-123',
    settings: {
      allowExplicit: false,
      description: 'Smooth jazz and neo-soul for late night relaxation',
      referenceArtists: [
        { name: 'Miles Davis', type: 'artist', uri: 'spotify:artist:mil1' },
        { name: 'John Coltrane', type: 'artist', uri: 'spotify:artist:col1' },
        { name: 'Billie Holiday', type: 'artist', uri: 'spotify:artist:bil1' }
      ],
      targetTotalTracks: 40
    }
  },
  {
    _docId: 'mock-playlist-5',
    aiGeneration: {
      enabled: true,
      isInstrumentalOnly: false,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      tracksToAdd: 12
    },
    curationRules: {
      maxTrackAgeDays: 45,
      maxTracksPerArtist: 2,
      removeDuplicates: true,
      shuffleAtEnd: true,
      sizeLimitStrategy: 'drop_random'
    },
    enabled: true,
    id: 'spotify:playlist:37i9dQZF1DX1s9knjP51Oa',
    imageUrl: 'https://i.scdn.co/image/ab67706c0000da84e4e4e4e4e4e4e4e4e4e4e4e4',
    mandatoryTracks: [
      {
        artist: 'Acoustic Collective',
        name: 'Morning Brew',
        positionRange: { max: 3, min: 1 },
        uri: 'spotify:track:5ygDXis42ncn6kYG14lEVG'
      }
    ],
    name: '☕ Morning Coffee',
    ownerId: 'debug-user-123',
    settings: {
      allowExplicit: false,
      description: 'Gentle acoustic and indie folk to ease into the morning',
      referenceArtists: [
        { name: 'Bon Iver', type: 'artist', uri: 'spotify:artist:bon1' },
        { name: 'Iron & Wine', type: 'artist', uri: 'spotify:artist:iron1' },
        { name: 'Fleet Foxes', type: 'artist', uri: 'spotify:artist:fleet1' }
      ],
      targetTotalTracks: 25
    }
  }
];
