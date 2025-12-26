import express from "express";
import SpotifyWebApi from "spotify-web-api-node";
import open from "open";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    const scopes = [
        "playlist-read-private",
        "playlist-modify-public",
        "playlist-modify-private",
        "user-library-read",
        "user-library-modify"
    ];

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = "http://127.0.0.1:8888/callback";

    if (!clientId || !clientSecret) {
        console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env file");
        process.exit(1);
    }

    const spotifyApi = new SpotifyWebApi({
        clientId,
        clientSecret,
        redirectUri,
    });

    const app = express();
    const PORT = 8888;

    app.get("/login", (_req, res) => {
        res.redirect(spotifyApi.createAuthorizeURL(scopes, "state"));
    });

    app.get("/callback", async (req, res) => {
        const error = req.query.error;
        const code = req.query.code as string;

        if (error) {
            res.send(`Callback Error: ${error}`);
            return;
        }

        if (!code) {
            res.send("Callback Error: No 'code' parameter found.");
            return;
        }

        try {
            const data = await spotifyApi.authorizationCodeGrant(code);
            const accessToken = data.body["access_token"];
            const refreshToken = data.body["refresh_token"];
            const expiresIn = data.body["expires_in"];

            console.log("\n--- TOKENS GENERATED ---\n");
            console.log(`Access Token: ${accessToken}`);
            console.log(`Refresh Token: ${refreshToken}`);
            console.log(`Expires in: ${expiresIn}`);
            console.log("\n------------------------\n");

            res.send("Success! Check your terminal for the tokens.");

            setTimeout(() => {
                process.exit(0);
            }, 1000);
        } catch (err) {
            res.send(`Error getting Tokens: ${err}`);
        }
    });

    app.listen(PORT, "127.0.0.1", async () => {
        console.log(`HTTP Server running on http://127.0.0.1:${PORT}`);
        console.log("Waiting for authentication...");
        await open(`http://127.0.0.1:${PORT}/login`);
    });
}

main().catch(console.error);
