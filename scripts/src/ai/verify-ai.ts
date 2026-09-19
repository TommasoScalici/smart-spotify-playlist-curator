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

    console.log('Sending request to Gemini AI (gemini-3.8-flash)...');
    const start = Date.now();
    const response = await ai.models.generateContent({
      contents: 'Suggest 3 upbeat pop songs from the 80s',
      model: 'gemini-3.8-flash'
    });
    const duration = Date.now() - start;

    console.log(`Response received in ${duration}ms`);
    console.log('Result:', response.text);
    console.log('✅ Verification SUCCESS: Received valid AI response.');
  } catch (error) {
    console.error('❌ Verification ERROR:', error);
  }
}

main();
