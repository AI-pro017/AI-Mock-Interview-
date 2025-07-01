import { NextResponse } from 'next/server';

export async function POST(req) {
  console.log("Text-to-speech API called");
  
  try {
    // Parse the request body
    const body = await req.json();
    const { text, speed } = body;
    
    console.log("Text to convert:", text?.substring(0, 50) + "...");
    console.log("Voice speed:", speed || "default (1.0)");

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

    // Process text to add natural speech patterns
    const processedText = addNaturalSpeechPatterns(text);
    console.log("Processed text with natural pauses");

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
        text: processedText,
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

// Helper function to add natural speech patterns with pauses
function addNaturalSpeechPatterns(text) {
  // Replace periods with a slightly longer pause (using SSML)
  let processedText = text.replace(/\./g, '.<break time="500ms"/>');
  
  // Replace commas with a shorter pause
  processedText = processedText.replace(/,/g, ',<break time="300ms"/>');
  
  // Add pauses after question marks
  processedText = processedText.replace(/\?/g, '?<break time="600ms"/>');
  
  // Add slight pauses between sentences when there are no punctuation marks
  processedText = processedText.replace(/(\w+)(\s+)(\w+)/g, (match, word1, space, word2) => {
    // Only add a pause occasionally to make it sound more natural
    if (Math.random() < 0.1 && word1.length > 3 && word2.length > 3) {
      return `${word1}<break time="150ms"/>${space}${word2}`;
    }
    return match;
  });
  
  // Wrap the text in SSML to enable breaks
  return `<speak>${processedText}</speak>`;
} 