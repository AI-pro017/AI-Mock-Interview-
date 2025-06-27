import { createClient } from '@deepgram/sdk';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Use the v4 SDK initialization format
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // Create a temporary API key for client-side use
    // In v4, the method is deepgram.manage.createProjectKey
    const { result, error } = await deepgram.manage.createProjectKey(
      process.env.DEEPGRAM_PROJECT_ID, // Make sure this env var is set
      {
        comment: 'Temporary key for mock interview',
        scopes: ['member'],
        time_to_live: 60 * 60 // Expires in 1 hour
      }
    );

    if (error || !result || !result.key) {
      console.error('Deepgram Key Creation Error:', error || 'No key returned');
      return NextResponse.json({ error: error?.message || 'Failed to create Deepgram key' }, { status: 500 });
    }

    return NextResponse.json({ deepgramToken: result.key });
  } catch (e) {
    console.error('An unexpected error occurred:', e);
    return NextResponse.json({ error: e.message || 'An internal server error occurred' }, { status: 500 });
  }
}