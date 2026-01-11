// import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '../../../functions/src/config/env.js';

async function main() {
  console.log('Listing available models...');

  try {
    // const genAI = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY);
    // Note: listModels is not directly on genAI instance in some versions?
    // Actually it is usually on GoogleGenerativeAI instance or via ModelManager (if exposed).
    // Let's check if there is a way.
    // In @google/generative-ai, there isn't a direct listModels helper easily documented in basic usage.
    // It relies on making a fetch to https://generativelanguage.googleapis.com/v1beta/models?key=...

    // Let's try a direct fetch to be sure, avoiding SDK quirks for this debug step.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.GOOGLE_AI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      console.log('Available Models:');
      data.models.forEach((m: { name: string; displayName: string }) =>
        console.log(`- ${m.name} (${m.displayName})`)
      );
    } else {
      console.log('No models found or error:', data);
    }
  } catch (error: unknown) {
    console.error('Error listing models:', error instanceof Error ? error.message : String(error));
  }
}

main();
