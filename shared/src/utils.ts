/**
 * Generates a deterministic Firestore document ID from a Spotify URI.
 * Replaces all colons (:) with underscores (_) to ensure URL-safe document IDs.
 *
 * Example: `spotify:playlist:37i9dQZF1E8O5lFmE7v5wN` -> `spotify_playlist_37i9dQZF1E8O5lFmE7v5wN`
 *
 * @param spotifyUri - The full Spotify URI (e.g. `spotify:playlist:ID`, `spotify:track:ID`)
 * @returns A safe, deterministic ID string for Firestore
 */
export function getPlaylistDocId(spotifyUri: string): string {
  if (!spotifyUri) return '';
  // Normalize then replace
  return normalizeSpotifyUri(spotifyUri).replace(/:/g, '_');
}

/**
 * Standardizes a Spotify URI by lowercasing the scheme and type parts
 * while preserving the case of the ID (Spotify IDs are case-sensitive).
 *
 * Example: `Spotify:Track:ABC123` -> `spotify:track:ABC123`
 */
export function normalizeSpotifyUri(uri: string): string {
  if (!uri) return '';
  const parts = uri.split(':');
  if (parts.length < 3) return uri; // Handle dummy values like 'm1' or 's1'

  const scheme = parts[0].toLowerCase();
  const type = parts[1].toLowerCase();
  const id = parts.slice(2).join(':');

  return `${scheme}:${type}:${id}`;
}
