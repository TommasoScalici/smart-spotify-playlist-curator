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
  return spotifyUri.replace(/:/g, '_');
}
