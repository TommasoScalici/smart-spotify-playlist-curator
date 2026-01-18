const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID; // We need to add this to .env
const SCOPES = ['playlist-read-private', 'playlist-modify-public', 'playlist-modify-private'];

export const useSpotifyAuth = () => {
  const login = () => {
    // Determine Redirect URI based on environment
    // Use explicit VITE_ env var if set, otherwise fallback to window origin
    const redirectUri =
      import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin + '/callback';

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
