import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Initializing Gemini AI verification...');

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not set in environment.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('Sending request to Gemini AI...');
    const start = Date.now();
    const result = await model.generateContent('Suggest 3 upbeat pop songs from the 80s');
    const duration = Date.now() - start;

    console.log(`Response received in ${duration}ms`);
    console.log('Result:', result.response.text());
    console.log('✅ Verification SUCCESS: Received valid AI response.');
  } catch (error) {
    console.error('❌ Verification ERROR:', error);
  }
}

main();
