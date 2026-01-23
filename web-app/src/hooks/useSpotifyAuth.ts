const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID; // We need to add this to .env
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private'
];

/**
 * Hook for handling Spotify OAuth2 authentication flow.
 * @returns Object containing the login function
 */
export const useSpotifyAuth = () => {
  /**
   * Initiates the Spotify login redirect.
   * Constructs the authorization URL with necessary scopes and redirects the user.
   */
  const login = () => {
    const redirectUri =
      import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      show_dialog: 'true'
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  return { login };
};
