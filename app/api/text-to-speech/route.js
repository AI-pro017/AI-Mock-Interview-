import { NextResponse } from 'next/server';
import ElevenLabs from 'elevenlabs-node';

export async function POST(req) {
  const { text } = await req.json();
  console.log("Text-to-speech API called with text:", text?.substring(0, 50) + "...");

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    // Check if API key exists
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is missing");
      return NextResponse.json({ error: 'ElevenLabs API key is not configured' }, { status: 500 });
    }

    // Go back to using the SDK - it was working before according to you
    const voice = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
    });

    console.log("Generating audio with ElevenLabs SDK");
    const audioBuffer = await voice.textToSpeech({
      textInput: text,
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
    });
    
    console.log(`Audio generated successfully, size: ${audioBuffer.byteLength} bytes`);

    // Return the audio
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('ElevenLabs API Error:', error);
    // More descriptive error response
    return NextResponse.json({ 
      error: 'Failed to generate audio from ElevenLabs',
      details: error.message 
    }, { status: 500 });
  }
} 