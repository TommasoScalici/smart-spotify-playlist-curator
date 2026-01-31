import { existsSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { setGlobalOptions } from 'firebase-functions/v2';

// Load environment variables from root .env ONLY for local development
// In Cloud Functions, credentials are automatically provided
const isLocalDevelopment = !process.env.FUNCTION_TARGET && !process.env.K_SERVICE;
if (isLocalDevelopment) {
  const envPath = resolve(__dirname, '../../.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

// Set max instances to 1 for sequential processing (safety against rate limits)
setGlobalOptions({ maxInstances: 1 });

// Export Controllers
export { exchangeSpotifyToken } from './controllers/auth-controller.js';
export { getPlaylistMetrics } from './controllers/playlist-controller.js';
export {
  runOrchestrator,
  triggerCuration,
  estimateCuration
} from './controllers/curation-controller.js';
export { searchSpotify, getTrackDetails } from './controllers/spotify-controller.js';
export { suggestReferenceArtists } from './controllers/discovery-controller.js';
