import * as dotenv from 'dotenv';
import { SpotifyService } from './services/spotify-service';

// 1. Carichiamo le variabili d'ambiente (il Service ne ha bisogno)
dotenv.config();

async function runTest() {
    console.log('🎵 Avvio test SpotifyService...');

    try {
        // Istanziamo il service (dovrebbe caricare le config da env)
        const service = SpotifyService.getInstance();

        // --- TEST 1: Lettura Playlist (Auth + Pagination) ---
        // Usiamo l'ID della playlist "Instrumental Prog" che mi hai dato
        const testPlaylistId = '32xYNI24QWMWfSgG1xZgjI';

        console.log(`\n📡 Fetching tracks from playlist: ${testPlaylistId}...`);
        try {
            const tracks = await service.getPlaylistTracks(testPlaylistId);
            console.log(`✅ Successo! Trovati ${tracks.length} brani totali.`);

            if (tracks.length > 0) {
                console.log('   Anteprima primi 3 brani:');
                tracks.slice(0, 3).forEach((t, i) => {
                    console.log(`   ${i + 1}. [${t.addedAt.split('T')[0]}] ${t.artist} - ${t.name}`);
                });
            }
        } catch (error: any) {
            console.error(`❌ Errore nel TEST 1 (Playlist):`, error.message);
        }

        // --- TEST 2: Ricerca Brano (Search API) ---
        const query = 'Pink Floyd Time';
        console.log(`\n🔍 Testing Search per: "${query}"...`);

        try {
            const searchResult = await service.searchTrack(query);

            if (searchResult) {
                console.log(`✅ Trovato: ${searchResult}`); // Dovrebbe stampare l'URI
            } else {
                console.warn('⚠️ Nessun risultato trovato (strano per i Pink Floyd).');
            }
        } catch (error: any) {
            console.error(`❌ Errore nel TEST 2 (Search):`, error.message);
        }

    } catch (error) {
        console.error('❌ ERRORE INIZIALIZZAZIONE:', error);
        process.exit(1);
    }
}

runTest();