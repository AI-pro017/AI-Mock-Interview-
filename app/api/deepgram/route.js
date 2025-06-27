import { NextResponse } from 'next/server';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify environment variables are available
    if (!process.env.DEEPGRAM_PROJECT_ID || !process.env.DEEPGRAM_API_KEY) {
      console.error('Deepgram API Error: Missing environment variables');
      return NextResponse.json({ 
        error: 'Configuration error', 
        message: 'Missing Deepgram credentials' 
      }, { status: 500 });
    }

    // Create a temporary API key using direct API call instead of SDK
    const response = await fetch(`https://api.deepgram.com/v1/projects/${process.env.DEEPGRAM_PROJECT_ID}/keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comment: 'Temporary key for mock interview',
        scopes: ['member'],
        time_to_live_in_seconds: 3600 // 1 hour
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Deepgram API Error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to create Deepgram key', 
        details: errorData 
      }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data || !data.key) {
      console.error('Deepgram response missing key:', data);
      return NextResponse.json({ error: 'Invalid response from Deepgram API' }, { status: 500 });
    }

    return NextResponse.json({ deepgramToken: data.key });
  } catch (error) {
    console.error('Error creating Deepgram key:', error.message);
    return NextResponse.json({ 
      error: 'Error creating Deepgram key', 
      message: error.message 
    }, { status: 500 });
  }
}