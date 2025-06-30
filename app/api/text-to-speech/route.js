import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Direct API call to ElevenLabs using axios for more control
    const response = await axios({
      method: 'POST',
      url: 'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      data: {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      responseType: 'arraybuffer'
    });

    // Return the audio as a Response object
    return new Response(response.data, {
      headers: {
        'Content-Type': 'audio/mpeg'
      }
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    
    // Detailed error logging
    if (error.response) {
      console.error(`ElevenLabs API returned status ${error.response.status}`);
      console.error('Error data:', error.response.data.toString());
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate audio', 
      details: error.message 
    }, { status: 500 });
  }
} 