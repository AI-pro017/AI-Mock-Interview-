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
  const audioRef = useRef(null);
  const deepgramConnectionRef = useRef(null);
  const abortControllerRef = useRef(null);

  // --- AI RESPONSE LOGIC ---
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAISpeaking(false);
    setIsGenerating(false);
  }, []);

  const generateAIResponse = async (prompt) => {
    try {
      setIsGenerating(true);
      setError(null);
      abortControllerRef.current = new AbortController();
      
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
      
      // Process the text stream instead of trying to parse as JSON
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completeResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        completeResponse += chunk;
      }
      
      return completeResponse;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error generating AI response:", err);
        setError(err);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const speakText = async (text) => {
    try {
      setIsAISpeaking(true);
      setError(null);
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) throw new Error('Failed to generate speech');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Make sure to resume the Deepgram audio context when the AI stops speaking
      audio.onended = () => {
        setIsAISpeaking(false);
        if (deepgramConnectionRef.current?.audioContext?.state === 'suspended') {
          deepgramConnectionRef.current.audioContext.resume()
            .catch(e => console.error("Failed to resume audio context:", e));
        }
      };
      
      await audio.play();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error converting text to speech:", err);
        setError(err);
      }
    } finally {
      setIsAISpeaking(false);
      audioRef.current = null;
    }
  };

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
    const aiResponseText = await generateAIResponse(prompt);
    
    if (aiResponseText) {
      setConversation(prev => [...prev, { role: 'ai', text: aiResponseText }]);
      await speakText(aiResponseText);
    }
  }, [conversation, createPrompt, generateAIResponse, speakText]);
  
  // --- SPEECH RECOGNITION LOGIC ---
  const handleTranscript = useCallback((data) => {
    console.log("🔍 TRANSCRIPT DATA RECEIVED:", JSON.stringify(data, null, 2));
    
    // Make sure we have valid data with alternatives
    if (!data || !data.channel || !data.channel.alternatives || data.channel.alternatives.length === 0) {
      console.warn("🔍 Invalid transcript data structure:", data);
      return;
    }
    
    const transcript = data.channel.alternatives[0].transcript;
    console.log(`🔍 TRANSCRIPT TEXT: "${transcript}"`);
    
    if (isAISpeaking) {
      console.log("🔍 AI is speaking, stopping...");
      stopSpeaking();
    }
    
    // Only process if there's actual text
    if (!transcript || transcript.trim() === "") {
      console.log("🔍 Empty transcript, ignoring");
      return;
    }
    
    if (data.is_final) {
      console.log(`🔍 FINAL TRANSCRIPT: "${transcript}"`);
      userResponseBufferRef.current += transcript + ' ';
      const finalText = userResponseBufferRef.current.trim();
      console.log(`🔍 UPDATED USER RESPONSE: "${finalText}"`);
      setCurrentUserResponse(finalText);
      setInterimTranscript('');
    } else {
      console.log(`🔍 INTERIM TRANSCRIPT: "${transcript}"`);
      setInterimTranscript(transcript);
    }
    
    // Force a UI update to make sure the transcript appears
    setIsUserSpeaking(true);
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
    console.log("🎤 Starting to listen with stream:", audioStream?.active);
    if (!audioStream || !audioStream.active) {
      const e = new Error("Audio stream is not active.");
      console.error("🎤 Audio stream error:", e);
      setError(e);
      return;
    }

    try {
      console.log("🎤 Fetching Deepgram token...");
      const response = await fetch('/api/deepgram');
      if (!response.ok) throw new Error('Failed to get Deepgram token');
      const { deepgramToken } = await response.json();
      console.log("🎤 Got Deepgram token:", deepgramToken ? "✓" : "✗");

      const deepgram = createClient(deepgramToken);
      
      // Log additional details about the Deepgram client
      console.log("🎤 Deepgram client created:", !!deepgram);
      
      const connection = deepgram.listen.live({
        model: "nova-2", 
        language: "en-US", 
        smart_format: true,
        interim_results: true, 
        vad_events: true, 
        encoding: 'linear16', 
        sample_rate: 16000,
        channels: 1
      });
      
      console.log("🎤 Deepgram connection created");

      // Add debugging for all connection events
      connection.on("open", () => {
        console.log("🎤 Deepgram connection OPENED");
        setIsListening(true);
      });
      
      connection.on("close", (event) => {
        console.log("🎤 Deepgram connection CLOSED", event);
        setIsListening(false);
      });
      
      connection.on('error', (e) => { 
        console.error("🎤 Deepgram ERROR:", e); 
        setError(e); 
      });
      
      // Add a counter to track how many transcripts we receive
      let transcriptCount = 0;
      
      connection.on('transcript', (data) => {
        transcriptCount++;
        console.log(`🎤 TRANSCRIPT EVENT #${transcriptCount}:`, data.channel?.alternatives?.[0]?.transcript || "empty");
        handleTranscript(data);
      });
      
      connection.on('VADEvent', (event) => {
        console.log("🎤 VAD Event:", event.label);
        if (event.label === 'speech_start') handleSpeechStart();
        if (event.label === 'speech_end') handleSpeechEnd();
      });

      console.log("🎤 Setting up AudioContext...");
      const audioContext = new AudioContext();
      
      // Make sure audio context is running
      if (audioContext.state !== "running") {
        console.log("🎤 Audio context not running, attempting to resume...");
        await audioContext.resume();
        console.log("🎤 Audio context state after resume:", audioContext.state);
      }
      
      await audioContext.audioWorklet.addModule('/audio-processor.js'); 
      console.log("🎤 AudioWorklet module loaded");
      
      console.log("🎤 Creating audio processing pipeline...");
      const source = audioContext.createMediaStreamSource(audioStream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      // Add a counter to track audio packets
      let audioPacketCount = 0;
      const audioPacketSizes = [];
      
      workletNode.port.onmessage = (event) => {
        if (!event.data) {
          console.warn("🎤 Empty audio data received");
          return;
        }
        
        audioPacketCount++;
        
        // Log every 100th packet to avoid console spam
        if (audioPacketCount % 100 === 0) {
          const bufferSize = event.data.byteLength;
          audioPacketSizes.push(bufferSize);
          console.log(`🎤 Audio packet #${audioPacketCount}, size: ${bufferSize} bytes`);
          
          // Calculate average size of last 10 packets
          if (audioPacketSizes.length > 10) {
            const avg = audioPacketSizes.slice(-10).reduce((a, b) => a + b, 0) / 10;
            console.log(`🎤 Average audio packet size (last 10): ${avg.toFixed(2)} bytes`);
            // Clean up array to prevent memory growth
            if (audioPacketSizes.length > 20) {
              audioPacketSizes.splice(0, 10);
            }
          }
        }
        
        if (!isMicMuted && connection.getReadyState() === 1) {
          connection.send(event.data);
        }
      };

      // Explicitly avoid connecting to destination to prevent feedback
      source.connect(workletNode);
      console.log("🎤 Audio pipeline connected");
      
      // Store a reference to our setup
      deepgramConnectionRef.current = { 
        connection, 
        audioContext, 
        workletNode, 
        source,
        stream: audioStream
      };
      
      console.log("🎤 Setup complete, listening for speech...");
      
      // Add a diagnostic timer to check if we're receiving transcripts
      const diagnosticTimer = setTimeout(() => {
        if (transcriptCount === 0) {
          console.warn("⚠️ No transcripts received after 5 seconds. Possible issues:");
          console.warn("⚠️ 1. Microphone may not be active or picking up audio");
          console.warn("⚠️ 2. Audio data may not be reaching Deepgram");
          console.warn("⚠️ 3. Deepgram connection may have issues");
          
          // Check if connection is still open
          console.log("⚠️ Deepgram connection state:", connection.getReadyState());
          
          // Try to force a reconnection
          console.log("⚠️ Attempting to stimulate the connection...");
          if (connection.getReadyState() === 1) {
            connection.keepAlive();
          }
        } else {
          console.log(`✅ Received ${transcriptCount} transcripts in the first 5 seconds. Connection working!`);
        }
      }, 5000);
      
      // Store the timer so we can clear it
      deepgramConnectionRef.current.diagnosticTimer = diagnosticTimer;
      
    } catch (e) {
      console.error("🎤 CRITICAL ERROR in speech recognition setup:", e);
      setError(e);
    }
  }, [isMicMuted, handleTranscript, handleSpeechStart, handleSpeechEnd]);

  const stopListening = useCallback(() => {
    console.log("🎤 Stopping speech recognition...");
    if (deepgramConnectionRef.current) {
      // Clear any timers
      if (deepgramConnectionRef.current.diagnosticTimer) {
        clearTimeout(deepgramConnectionRef.current.diagnosticTimer);
      }
      
      // Close and clean up resources
      if (deepgramConnectionRef.current.workletNode) {
        deepgramConnectionRef.current.workletNode.port.close();
        deepgramConnectionRef.current.workletNode.disconnect();
      }
      if (deepgramConnectionRef.current.source) {
        deepgramConnectionRef.current.source.disconnect();
      }
      if (deepgramConnectionRef.current.audioContext) {
        deepgramConnectionRef.current.audioContext.close()
          .catch(e => console.error("🎤 Error closing audio context:", e));
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
    const aiResponseText = await generateAIResponse(prompt);
    if (aiResponseText) {
      setConversation([{ role: 'ai', text: aiResponseText }]);
      await speakText(aiResponseText);
    }
  }, [startListening, createPrompt, generateAIResponse, speakText]);

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