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
    console.log("Transcript data received:", data);
    if (!data.channel?.alternatives?.[0]) return;
    
    const transcript = data.channel.alternatives[0].transcript;
    console.log("Transcript text:", transcript);
    
    if (isAISpeaking) stopSpeaking();
    
    if (data.is_final && transcript.trim()) {
      console.log("Final transcript:", transcript);
      userResponseBufferRef.current += transcript + ' ';
      setCurrentUserResponse(userResponseBufferRef.current.trim());
      setInterimTranscript('');
    } else if (transcript.trim()) {
      console.log("Interim transcript:", transcript);
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
    console.log("Starting to listen with stream:", audioStream?.active);
    if (!audioStream || !audioStream.active) {
      const e = new Error("Audio stream is not active.");
      console.error("Audio stream error:", e);
      setError(e);
      return;
    }

    try {
      console.log("Fetching Deepgram token...");
      const response = await fetch('/api/deepgram');
      if (!response.ok) throw new Error('Failed to get Deepgram token');
      const { deepgramToken } = await response.json();
      console.log("Got Deepgram token:", deepgramToken ? "✓" : "✗");

      const deepgram = createClient(deepgramToken);
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

      connection.on("open", () => {
        console.log("Deepgram connection OPENED");
        setIsListening(true);
      });
      
      connection.on("close", () => {
        console.log("Deepgram connection CLOSED");
        setIsListening(false);
      });
      
      connection.on('error', (e) => { 
        console.error("Deepgram ERROR:", e); 
        setError(e); 
      });
      
      connection.on('transcript', (data) => {
        console.log("Got transcript event:", data.channel?.alternatives?.[0]?.transcript);
        handleTranscript(data);
      });
      
      connection.on('VADEvent', (event) => {
        console.log("VAD Event:", event.label);
        if (event.label === 'speech_start') handleSpeechStart();
        if (event.label === 'speech_end') handleSpeechEnd();
      });

      console.log("Setting up AudioContext...");
      const audioContext = new AudioContext();
      await audioContext.audioWorklet.addModule('/audio-processor.js'); 
      
      console.log("Creating audio processing pipeline...");
      const source = audioContext.createMediaStreamSource(audioStream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      workletNode.port.onmessage = (event) => {
        const audioData = event.data;
        if (!isMicMuted && connection.getReadyState() === 1) {
          connection.send(audioData);
        }
      };

      source.connect(workletNode);
      console.log("Audio pipeline connected");
      
      deepgramConnectionRef.current = { 
        connection, 
        audioContext, 
        workletNode, 
        source 
      };
    } catch (e) {
      console.error("CRITICAL ERROR in speech recognition setup:", e);
      setError(e);
    }
  }, [isMicMuted, handleTranscript, handleSpeechStart, handleSpeechEnd]);

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