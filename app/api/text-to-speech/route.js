import { NextResponse } from 'next/server';
import ElevenLabs from 'elevenlabs-node';

export async function POST(req) {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const voice = new ElevenLabs({
    apiKey: process.env.ELEVENLABS_API_KEY, 
    voiceId: '21m00Tcm4TlvDq8ikWAM', // A popular standard voice, 'Rachel'
  });

  try {
    const stream = await voice.textToSpeechStream({
      textInput: text,
      modelId: 'eleven_multilingual_v2', // Use the latest model
      stability: 0.5,
      similarityBoost: 0.75,
      style: 1,
      responseType: 'stream',
    });

    // Return the audio stream directly to the client
    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('ElevenLabs API Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio from ElevenLabs' }, { status: 500 });
  }
} 