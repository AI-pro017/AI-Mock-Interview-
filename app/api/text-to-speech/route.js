import { NextResponse } from 'next/server';
import ElevenLabs from 'elevenlabs-node';

export async function POST(req) {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    // Simple configuration for the voice
    const voice = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY, 
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
    });

    // Stream option was the original implementation that worked
    const stream = await voice.textToSpeechStream({
      textInput: text,
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
      responseType: 'stream',
    });

    // Return the audio stream directly
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