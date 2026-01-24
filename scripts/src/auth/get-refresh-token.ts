import express from 'express';
import open from 'open';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const scopes = [
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'user-read-private',
    'user-read-email'
  ];

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8888/callback';

  if (!clientId || !clientSecret) {
    console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env file');
    process.exit(1);
  }

  const app = express();
  const PORT = 8888;
  const state = randomBytes(16).toString('hex');

  app.get('/login', (_req: Request, res: Response) => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      state: state
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  });

  app.get('/callback', async (req: Request, res: Response) => {
    const error = req.query.error;
    const code = req.query.code as string;
    const returnedState = req.query.state as string;

    if (error) {
      res.send(`Callback Error: ${error}`);
      return;
    }

    if (state !== returnedState) {
      res.send(`Callback Error: State mismatch.`);
      return;
    }

    if (!code) {
      res.send("Callback Error: No 'code' parameter found.");
      return;
    }

    try {
      // Exchange code for tokens
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      });

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`
        },
        body: params
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errText}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const expiresIn = data.expires_in;

      console.log('\n--- TOKENS GENERATED ---\n');
      console.log(`Access Token: ${accessToken}`);
      console.log(`Refresh Token: ${refreshToken}`);
      console.log(`Expires in: ${expiresIn}`);
      console.log('\n------------------------\n');

      res.send('Success! Check your terminal for the tokens.');

      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (err) {
      res.send(`Error getting Tokens: ${err}`);
      console.error(err);
    }
  });

  app.listen(PORT, '127.0.0.1', async () => {
    console.log(`HTTP Server running on http://127.0.0.1:${PORT}`);
    console.log('Waiting for authentication...');
    await open(`http://127.0.0.1:${PORT}/login`);
  });
}

main().catch(console.error);
