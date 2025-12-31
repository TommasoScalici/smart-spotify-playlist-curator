
import { loadAppConfig } from "../../functions/src/config/config";
import { SpotifyService } from "../../functions/src/services/spotify-service";

async function main() {
    console.log("Checking Playlist State...");

    try {
        const config = loadAppConfig();
        // Find the Instrumental Prog playlist
        const playlistConfig = config.find(c => c.name.includes("Instrumental Prog"));

        if (!playlistConfig) {
            console.error("Playlist not found in config.");
            return;
        }

        const playlistId = playlistConfig.id.replace("spotify:playlist:", "");
        console.log(`Inspecting: ${playlistConfig.name} (${playlistId})`);

        const spotifyService = SpotifyService.getInstance();
        const tracks = await spotifyService.getPlaylistTracks(playlistId);

        console.log(`\nTotal Tracks: ${tracks.length}`);
        console.log(`Target Total: ${playlistConfig.settings.targetTotalTracks}`);
        console.log(`Difference: ${tracks.length - playlistConfig.settings.targetTotalTracks}`);

        console.log("\nCurrent Tracks:");
        tracks.forEach((t, i) => {
            console.log(`${i + 1}. ${t.artist} - ${t.name} (${t.uri})`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
