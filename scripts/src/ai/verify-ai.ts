import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Initializing Gemini AI verification via @google/genai...');

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not set in environment.');
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log('Sending request to Gemini AI (gemini-3.8-flash via Interactions API)...');
    const start = Date.now();
    const interaction = await ai.interactions.create({
      generation_config: {
        thinking_level: 'low'
      },
      input: 'Suggest 3 upbeat pop songs from the 80s',
      model: 'gemini-3.8-flash',
      store: false
    });
    const duration = Date.now() - start;

    console.log(`Response received in ${duration}ms`);
    console.log('Result:', interaction.output_text);
    console.log('✅ Verification SUCCESS: Received valid AI response.');
  } catch (error) {
    console.error('❌ Verification ERROR:', error);
  }
}

main();
