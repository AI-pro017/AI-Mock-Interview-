import { NextResponse } from 'next/server';

// Define voice IDs for different genders with expanded options
// These are ElevenLabs voice IDs - you may need to verify these with your account
const VOICE_IDS = {
  male: [
    "ZthjuvLPty3kTMaNKVKb", // Antoni - male voice
    "Bj9UqZbhQsanLzgalpEG", // Adam - male voice
    "EiNlNiXeDU1pqqOPrYMO", // Sam - male voice
    "IRHApOXLvnW57QJPQH2P", // Josh - male voice
    "kmSVBPu7loj4ayNinwWM", // Patrick - male voice
    "qAZH0aMXY8tw1QufPN0D", // Thomas - male voice
    "Ix8C14HEHgIQkJswik2o", // Ethan - male voice
    "GROMoQXjD2D16z0prfB1", // Marcus - male voice
    "3SF4rB1fGBMXU9xRM7pz", // Daniel - male voice
    "gUABw7pXQjhjt0kNFBTF", // James - male voice
    "scOwDtmlUjD3prqpp97I", // Michael - male voice
    "UQoLnPXvf18gaKpLzfb8", // David - male voice
  ],
  female: [
    "Z3R5wn05IrDiVCyEkUrK", // Rachel - female voice
    "ecp3DWciuUyW7BYM7II1", // Bella - female voice
    "yj30vwTGJxSHezdAGsv9", // Elli - female voice
    "BpjGufoPiobT79j2vtj4", // Domi - female voice
    "XW70ikSsadUbinwLMZ5w", // Ava - female voice
    "BZgkqPqms7Kj9ulSkVzn", // Grace - female voice
    "ZtcPZrt9K4w8e1OB9M6w", // Emily - female voice
    "yhFUAoS32gPDJFQHbH68", // Sophie - female voice
    "eBvoGh8YGJn1xokno71w", // Anna - female voice
    "iBo5PWT1qLiEyqhM7TrG", // Lily - female voice
    "SaqYcK3ZpDKBAImA8AdW", // Jessica - female voice
    "EQu48Nbp4OqDxsnYh27f", // Olivia - female voice
  ]
};

export async function POST(req) {
  console.log("Text-to-speech API called");
  
  try {
    // Parse the request body
    const body = await req.json();
    const { 
      text, 
      speed, 
      naturalSpeech = true, 
      gender = 'female', 
      voiceId = null,
      selectNewVoice = false
    } = body;
    
    console.log("Text to convert:", text?.substring(0, 50) + "...");
    console.log("Voice speed:", speed || "default (1.0)");
    console.log("Natural speech:", naturalSpeech ? "enabled" : "disabled");
    console.log("Gender requested:", gender);

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

    let selectedVoiceId = voiceId;
    
    // Select a new voice ID if requested or if none is provided
    if (!selectedVoiceId || selectNewVoice) {
      if (gender === 'male' && VOICE_IDS.male.length > 0) {
        const randomIndex = Math.floor(Math.random() * VOICE_IDS.male.length);
        selectedVoiceId = VOICE_IDS.male[randomIndex];
      } else {
        const randomIndex = Math.floor(Math.random() * VOICE_IDS.female.length);
        selectedVoiceId = VOICE_IDS.female[randomIndex];
      }
      console.log("Selected new voice ID:", selectedVoiceId);
    } else {
      console.log("Using provided voice ID:", selectedVoiceId);
    }
    
    // Process text for natural speech patterns if enabled
    let processedText = text;
    if (naturalSpeech) {
      processedText = addNaturalSpeechPatterns(text);
    }

    console.log("Making direct request to ElevenLabs API");
    
    // Call the ElevenLabs API
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: processedText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          speed: parseFloat(speed) || 1.0,
        }
      }),
    });

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      return NextResponse.json(
        { error: `ElevenLabs API error: ${errorText}` }, 
        { status: elevenLabsResponse.status }
      );
    }

    // Get the audio data as a blob/arrayBuffer
    const audioData = await elevenLabsResponse.arrayBuffer();
    
    // Return the audio data directly as audio/mpeg
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'x-voice-id': selectedVoiceId // Include the voice ID in a header
      }
    });
    
  } catch (error) {
    console.error("Text-to-speech error:", error);
    return NextResponse.json(
      { error: `Text-to-speech error: ${error.message}` }, 
      { status: 500 }
    );
  }
}

// Helper function to add natural speech patterns with pauses using ElevenLabs syntax
function addNaturalSpeechPatterns(text) {
  // Instead of using SSML tags, use natural punctuation to create pauses
  // ElevenLabs will automatically add appropriate pauses for punctuation
  
  // Add more periods where longer pauses are needed (instead of SSML)
  let processedText = text.replace(/\./g, '...');
  
  // Add slight pauses with commas where needed
  processedText = processedText.replace(/,/g, ', ');
  
  // Add strong pause after question marks
  processedText = processedText.replace(/\?/g, '?...');
  
  // Do not use the <break> tags that are causing issues
  // Do not wrap in <speak> tags
  
  return processedText;
} 