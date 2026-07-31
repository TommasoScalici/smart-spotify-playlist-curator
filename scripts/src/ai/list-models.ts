import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Listing available models...');

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not set in environment.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      models?: Array<{ displayName: string; name: string }>;
    };

    if (data.models) {
      console.log('Available Models:');
      data.models.forEach((m) => console.log(`- ${m.name} (${m.displayName})`));
    } else {
      console.log('No models found or error:', data);
    }
  } catch (error: unknown) {
    console.error('Error listing models:', error instanceof Error ? error.message : String(error));
  }
}

main();
