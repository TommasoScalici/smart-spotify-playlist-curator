# Smart Spotify Playlist Curator

A smart automation tool for curating Spotify playlists using Firebase Cloud Functions and the Spotify Web API.

## Project Structure

- `functions/`: Firebase Cloud Functions (Backend logic)
- `scripts/`: Utility scripts (e.g., Token generation)

## Setup

### Prerequisites

- Node.js (v20 or higher recommended)
- Firebase CLI (`npm install -g firebase-tools`)
- A Spotify Developer App ([Create here](https://developer.spotify.com/dashboard/applications))

### Installation

1. Clone the repository.
2. Install dependencies in both `functions` and `scripts` directories:
   ```bash
   cd functions && npm install
   cd ../scripts && npm install
   ```

### Configuration

1. **Spotify Application**:
   - Go to your Spotify Developer Dashboard.
   - Create an app.
   - Set the Redirect URI to: `http://127.0.0.1:8888/callback`

2. **Environment Variables**:
   - Navigate to `scripts/`.
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Fill in your `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.

### Getting Spotify Tokens

To authorize the application and generate your initial Refresh Token:

```bash
cd scripts
npm run get-refresh-token
```

Follow the on-screen instructions to log in. The tokens will be printed in the terminal.

## Development

- **Build Functions**: `cd functions && npm run build`
- **Lint**: `npm run lint`

## License

[MIT](LICENSE.md)
