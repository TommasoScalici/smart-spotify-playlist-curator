import { AiService } from '../../../functions/src/services/ai-service.js';

async function main() {
  console.log('Initializing AiService...');

  try {
    const aiService = new AiService();

    const prompt = 'Suggest 3 upbeat pop songs from the 80s';
    const promptConfig = {
      enabled: true,
      tracksToAdd: 3,
      isInstrumentalOnly: false,
      model: 'gemini-2.5-flash',
      temperature: 0.7
    };

    console.log('Sending request to Gemini AI...');
    const start = Date.now();
    const suggestions = await aiService.generateSuggestions(promptConfig, prompt, 3);
    const duration = Date.now() - start;

    console.log(`Response received in ${duration}ms`);
    console.log('Result:', JSON.stringify(suggestions, null, 2));

    if (suggestions.length > 0 && suggestions[0].artist && suggestions[0].track) {
      console.log('\u2705 Verification SUCCESS: Received valid JSON tracks.');
    } else {
      console.error('\u274C Verification FAILED: Invalid format or empty response.');
    }
  } catch (error) {
    console.error('\u274C Verification ERROR:', error);
  }
}

main();
