import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function POST(req) {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    // Make a direct API call to ElevenLabs instead of using the SDK
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
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

    if (!response.ok) {
      throw new Error(`ElevenLabs API returned ${response.status}: ${await response.text()}`);
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();

    // Return the raw audio
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg'
      }
    });
  } catch (error) {
    console.error('ElevenLabs API Error:', error);
    return NextResponse.json({ error: `Failed to generate audio: ${error.message}` }, { status: 500 });
  }
} 