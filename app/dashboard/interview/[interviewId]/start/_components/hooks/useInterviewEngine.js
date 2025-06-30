"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@deepgram/sdk';

export function useInterviewEngine(interview, isMicMuted) {
  // --- STATE MANAGEMENT ---
  const [conversation, setConversation] = useState([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUserResponse, setCurrentUserResponse] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  // --- REFS ---
  const userResponseBufferRef = useRef('');
  const silenceTimerRef = useRef(null);
  const deepgramConnectionRef = useRef(null);
  const abortControllerRef = useRef(null);
  const audioElementRef = useRef(null);

  // --- AI RESPONSE LOGIC ---
  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAISpeaking(false);
    setIsGenerating(false);
  }, []);

  const generateAndSpeak = useCallback(async (prompt) => {
    setIsGenerating(true);
    setIsAISpeaking(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    let accumulatedText = "";
    
    try {
      // Generate AI response
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          role: interview.jobPosition,
          interviewStyle: interview.interviewStyle,
          focus: interview.focus
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to generate AI response');
      
      const responseData = await response.json();
      const aiResponseText = responseData.response;
      
      // Update UI with the complete response
      accumulatedText = aiResponseText;
      setConversation(prev => {
          const lastItem = prev[prev.length - 1];
          if (lastItem && lastItem.role === 'ai') {
              lastItem.text = accumulatedText;
              return [...prev];
          }
          return [...prev, { role: 'ai', text: accumulatedText }];
      });

      // Now that we have the text, get the audio
      const ttsResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiResponseText })
      });
      
      if (!ttsResponse.ok) throw new Error('Failed to generate speech');
      
      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Use a standard HTML Audio element
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      
      // Set up audio event handlers
      audio.onended = () => {
        setIsAISpeaking(false);
        // Resume the deepgram audio context if it's suspended
        if (deepgramConnectionRef.current?.audioContext?.state === 'suspended') {
          deepgramConnectionRef.current.audioContext.resume()
            .then(() => console.log("🎤 AudioContext resumed after AI speech"))
            .catch(e => console.error("🎤 Error resuming AudioContext:", e));
        }
      };
      
      audio.onerror = (e) => {
        console.error("❌ Audio playback error:", e);
        setIsAISpeaking(false);
      };
      
      // Play the audio
      await audio.play();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error in generating/speaking:", err);
        setError(err);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [interview]);

  const createPrompt = useCallback((convHistory, type) => {
    if (type === 'greeting') {
      return `You are an expert interviewer starting an interview for a ${interview.jobPosition} role. The candidate has ${interview.jobExperience} years of experience. Greet them warmly and ask your first question. Keep your opening brief and natural.`;
    }
    const history = convHistory.map(item => `${item.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${item.text}`).join('\n');
    return `This is a real-time interview for a ${interview.jobPosition} role. Here is the conversation so far:\n${history}\n\nRespond naturally to the candidate's last message. Keep your response concise and conversational.`;
  }, [interview]);

  const processUserResponse = useCallback(async () => {
    const userResponse = userResponseBufferRef.current.trim();
    userResponseBufferRef.current = '';
    setInterimTranscript('');
    setCurrentUserResponse('');
    setIsUserSpeaking(false);
    if (!userResponse) return;

    const newConversation = [...conversation, { role: 'user', text: userResponse }];
    setConversation(newConversation);

    const prompt = createPrompt(newConversation, 'response');
    await generateAndSpeak(prompt);
  }, [conversation, createPrompt, generateAndSpeak]);
  
  // --- SPEECH RECOGNITION LOGIC ---
  const handleTranscript = useCallback((data) => {
    const transcript = data.channel.alternatives[0].transcript;
    console.log("📝 Processing transcript:", transcript);
    
    if (isAISpeaking) {
      console.log("📝 AI is speaking, stopping...");
      stopSpeaking();
    }
    
    if (data.is_final && transcript.trim()) {
      console.log("📝 FINAL transcript, adding to buffer:", transcript);
      userResponseBufferRef.current += transcript + ' ';
      setCurrentUserResponse(userResponseBufferRef.current.trim());
      setInterimTranscript('');
    } else if (transcript.trim()) {
      console.log("📝 INTERIM transcript, updating:", transcript);
      setInterimTranscript(transcript);
    }
  }, [isAISpeaking, stopSpeaking]);

  const handleSpeechStart = useCallback(() => {
    console.log("Speech start detected");
    clearTimeout(silenceTimerRef.current);
    setIsUserSpeaking(true);
    if (isAISpeaking) stopSpeaking();
  }, [isAISpeaking, stopSpeaking]);

  const handleSpeechEnd = useCallback(() => {
    console.log("Speech end detected");
    silenceTimerRef.current = setTimeout(() => {
      if (userResponseBufferRef.current.trim()) {
        processUserResponse();
      } else {
        setIsUserSpeaking(false);
      }
    }, 1200);
  }, [processUserResponse]);

  const startListening = useCallback(async (audioStream) => {
    console.log("🎤 startListening called with audioStream:", audioStream?.active);
    if (!audioStream?.active) {
      setError(new Error("Audio stream is not active."));
      return;
    }
    try {
      console.log("🎤 Fetching Deepgram token...");
      const response = await fetch('/api/deepgram');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get Deepgram token: ${errorData.error || response.statusText}`);
      }
      const { deepgramToken } = await response.json();
      console.log("🎤 Got Deepgram token, creating client...");
      
      // Create Deepgram client with proper configuration
      const deepgram = createClient(deepgramToken);
      const connection = deepgram.listen.live({
        model: "nova-2", 
        language: "en-US", 
        smart_format: true,
        interim_results: true, 
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });

      // Set up connection event handlers
      connection.on("open", () => {
        console.log("🎤 Deepgram connection OPENED");
        setIsListening(true);
      });
      
      connection.on("close", () => {
        console.log("🎤 Deepgram connection CLOSED");
        setIsListening(false);
      });
      
      connection.on('error', (e) => {
        console.error("🎤 Deepgram ERROR:", e);
        setError(e);
      });
      
      connection.on('transcript', (data) => {
        if (data && data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
          const transcript = data.channel.alternatives[0].transcript;
          console.log("📝 Received transcript:", transcript);
          
          if (transcript && transcript.trim()) {
            handleTranscript(data);
          }
        }
      });
      
      // Set up audio processing
      console.log("🎤 Setting up AudioContext...");
      const audioContext = new AudioContext();
      
      // Ensure audio context is in running state
      if (audioContext.state !== "running") {
        await audioContext.resume();
      }
      
      await audioContext.audioWorklet.addModule('/audio-processor.js'); 
      console.log("🎤 AudioWorklet module loaded");
      
      const source = audioContext.createMediaStreamSource(audioStream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      
      // Setup a buffer to collect and send audio in larger chunks
      let audioBuffer = [];
      const BUFFER_SIZE = 4096;
      
      workletNode.port.onmessage = (event) => {
        if (!isMicMuted && connection.getReadyState() === 1) {
          // Add the audio data to our buffer
          const newData = new Int16Array(event.data);
          audioBuffer = [...audioBuffer, ...Array.from(newData)];
          
          // If we have enough data, send it
          if (audioBuffer.length >= BUFFER_SIZE) {
            const dataToSend = new Int16Array(audioBuffer.slice(0, BUFFER_SIZE));
            connection.send(dataToSend.buffer);
            audioBuffer = audioBuffer.slice(BUFFER_SIZE);
          }
        }
      };

      // Connect the audio processing pipeline
      source.connect(workletNode);
      console.log("🎤 Audio pipeline connected");
      
      deepgramConnectionRef.current = { 
        connection, 
        audioContext, 
        workletNode, 
        source,
        stream: audioStream 
      };
      
    } catch (e) {
      console.error("🎤 CRITICAL ERROR in setup:", e);
      setError(e);
    }
  }, [isMicMuted, handleTranscript]);

  const stopListening = useCallback(() => {
    console.log("Stopping speech recognition...");
    if (deepgramConnectionRef.current) {
      if (deepgramConnectionRef.current.workletNode) {
        deepgramConnectionRef.current.workletNode.port.close();
        deepgramConnectionRef.current.workletNode.disconnect();
      }
      if (deepgramConnectionRef.current.source) {
        deepgramConnectionRef.current.source.disconnect();
      }
      if (deepgramConnectionRef.current.audioContext) {
        deepgramConnectionRef.current.audioContext.close()
          .catch(e => console.error("Error closing audio context:", e));
      }
      if (deepgramConnectionRef.current.connection) {
        deepgramConnectionRef.current.connection.finish();
      }
      deepgramConnectionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // --- CONVERSATION FLOW ---
  const startConversation = useCallback(async (audioStream) => {
    console.log("Starting conversation with stream:", audioStream?.active);
    startListening(audioStream);
    const prompt = createPrompt([], 'greeting');
    await generateAndSpeak(prompt);
  }, [startListening, createPrompt, generateAndSpeak]);

  const endConversation = useCallback(() => {
    console.log("Ending conversation...");
    stopListening();
    stopSpeaking();
    clearTimeout(silenceTimerRef.current);
  }, [stopListening, stopSpeaking]);

  useEffect(() => {
    return () => endConversation();
  }, [endConversation]);

  return { conversation, currentUserResponse, interimTranscript, isUserSpeaking, isAISpeaking, isListening, error, startConversation, endConversation };
} 