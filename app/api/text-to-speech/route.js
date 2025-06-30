import { NextResponse } from 'next/server';

export async function POST(req) {
  console.log("Text-to-speech API called");
  
  try {
    // Parse the request body
    const body = await req.json();
    const { text } = body;
    
    console.log("Text to convert:", text?.substring(0, 50) + "...");

    if (!text) {
      console.log("No text provided");
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Check if we have the API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY is missing");
      return NextResponse.json({ 
        error: 'ElevenLabs API key is not configured',
        envVars: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')).join(', ')
      }, { status: 500 });
    }

    console.log("Making direct request to ElevenLabs API");
    
    // Make direct fetch request to ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    console.log("ElevenLabs API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json({ 
        error: `ElevenLabs API returned ${response.status}`, 
        details: errorText 
      }, { status: response.status });
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();
    console.log("Audio buffer received, size:", audioBuffer.byteLength, "bytes");

    // Return the audio with correct MIME type
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg'
      }
    });
    
  } catch (error) {
    console.error("Text-to-speech error:", error);
    return NextResponse.json({ 
      error: 'Failed to generate audio', 
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 