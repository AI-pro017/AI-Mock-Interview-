import { NextResponse } from 'next/server';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify environment variables are available
    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('Deepgram API Error: Missing API key');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Missing Deepgram API key' 
      }, { status: 500 });
    }

    // Using the auth/token endpoint to get details about the API key
    // This is a lightweight way to validate the API key is working
    const response = await fetch('https://api.deepgram.com/v1/auth/token', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Deepgram API Error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to validate Deepgram API key', 
        details: errorData 
      }, { status: response.status });
    }

    // Simply return the API key for client use
    // Note: In production, you might want to use the token granting approach
    // via POST to /v1/auth/grant for more security
    return NextResponse.json({ deepgramToken: process.env.DEEPGRAM_API_KEY });
  } catch (error) {
    console.error('Error accessing Deepgram API:', error.message);
    return NextResponse.json({ 
      error: 'Error accessing Deepgram API', 
      message: error.message 
    }, { status: 500 });
  }
}