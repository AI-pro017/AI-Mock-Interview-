import { NextResponse } from 'next/server';

// Simple test endpoint to check if we can hit ElevenLabs API
export async function GET() {
  try {
    // Check if we have the API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'Missing API key',
        envVars: Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')).join(', ')
      }, { status: 500 });
    }
    
    // Try a simple request to the ElevenLabs API to get voices
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: `ElevenLabs API error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to ElevenLabs API',
      voiceCount: data.voices?.length || 0
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test ElevenLabs connection',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 