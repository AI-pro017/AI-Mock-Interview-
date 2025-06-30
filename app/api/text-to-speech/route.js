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
    // Use the non-streaming version for better browser compatibility
    const audioBuffer = await voice.textToSpeech({
      textInput: text,
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 1,
    });

    // Return the audio as a binary response
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

  } catch (error) {
    console.error('ElevenLabs API Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio from ElevenLabs' }, { status: 500 });
  }
} 