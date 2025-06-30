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

  // --- AI RESPONSE & SPEECH ---
  const generateAIResponse = useCallback(async (prompt) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, role: interview.jobPosition, interviewStyle: interview.interviewStyle, focus: interview.focus }),
      });
      if (!response.ok) throw new Error('Failed to generate AI response');
      const data = await response.json(); // Now this will work correctly
      return data.response;
    } catch (err) {
      console.error("Error generating AI response:", err);
      setError(err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [interview]);
  
  const speakText = useCallback(async (text) => {
    if (!text || text.trim() === "") return;

    setIsAISpeaking(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    // Get the audio context from the Deepgram connection to ensure it's the same one
    const audioContext = deepgramConnectionRef.current?.audioContext;
    if (!audioContext) {
      setError(new Error("Audio context not available for playback."));
      setIsAISpeaking(false);
      return;
    }

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Text-to-speech request failed with status ${response.status}`);
      }
      
      const audioData = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioData);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        // IMPORTANT: Resume mic input after AI finishes speaking
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        setIsAISpeaking(false);
      };

      source.start();
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error in text-to-speech playback:", err);
        setError(err);
      }
      setIsAISpeaking(false);
    }
  }, []);

  const createPrompt = useCallback((convHistory, type) => {
    if (type === 'greeting') {
      return `You are an expert interviewer starting an interview for a ${interview.jobPosition} role. The candidate has ${interview.jobExperience} years of experience. Greet them warmly and ask your first question.`;
    }
    const history = convHistory.map(item => `${item.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${item.text}`).join('\n');
    return `This is a real-time interview. Here is the history:\n${history}\n\nRespond naturally to the candidate's last message.`;
  }, [interview]);

  const processUserResponse = useCallback(async () => {
    const userResponse = userResponseBufferRef.current.trim();
    userResponseBufferRef.current = '';
    setInterimTranscript('');
    setCurrentUserResponse('');
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

  // --- REAL-TIME TRANSCRIPTION LOGIC ---
  const handleTranscript = useCallback((data) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (data.is_final && transcript.trim()) {
      userResponseBufferRef.current += transcript + ' ';
      setCurrentUserResponse(userResponseBufferRef.current.trim());
      setInterimTranscript('');
    } else {
      setInterimTranscript(transcript);
    }
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setIsUserSpeaking(false);
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
        if (userResponseBufferRef.current.trim()) {
            processUserResponse();
        }
    }, 500); // Shorter delay for responsiveness
  }, [processUserResponse]);

  const startListening = useCallback(async (audioStream) => {
    if (!audioStream.active) return;
    try {
      const response = await fetch('/api/deepgram');
      const { deepgramToken } = await response.json();
      const deepgram = createClient(deepgramToken);
      const connection = deepgram.listen.live({
        model: 'nova-2', language: 'en-US', smart_format: true,
        interim_results: true, vad_events: true
      });
      
      connection.on('open', () => setIsListening(true));
      connection.on('close', () => setIsListening(false));
      connection.on('error', (e) => { console.error("Deepgram Error:", e); setError(e); });
      connection.on('transcript', handleTranscript);
      connection.on('VADEvent', (event) => {
          if (event.label === 'speech_start') {
            setIsUserSpeaking(true);
            clearTimeout(silenceTimerRef.current);
          }
          if (event.label === 'speech_end') {
            handleSpeechEnd();
          }
      });
      
      const audioContext = new AudioContext();
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      const source = audioContext.createMediaStreamSource(audioStream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      workletNode.port.onmessage = (event) => {
        if (!isMicMuted && connection.getReadyState() === 1) {
          connection.send(event.data);
        }
      };
      source.connect(workletNode);
      deepgramConnectionRef.current = { connection, audioContext, workletNode, source };
    } catch (e) {
      console.error("Error setting up transcription:", e);
      setError(e);
    }
  }, [isMicMuted, handleTranscript, handleSpeechEnd]);

  // --- CONVERSATION FLOW & LIFECYCLE ---
  const startConversation = useCallback(async (audioStream) => {
    // Start listening first to initialize the audio context and Deepgram connection
    await startListening(audioStream);

    const prompt = createPrompt([], 'greeting');
    const aiResponseText = await generateAIResponse(prompt);

    if (aiResponseText) {
      setConversation([{ role: 'ai', text: aiResponseText }]);
      await speakText(aiResponseText);
    }
  }, [startListening, createPrompt, generateAIResponse, speakText]);

  const endConversation = useCallback(() => {
    if (deepgramConnectionRef.current) {
        deepgramConnectionRef.current.workletNode?.port.close();
        deepgramConnectionRef.current.source?.disconnect();
        deepgramConnectionRef.current.audioContext?.close();
        deepgramConnectionRef.current.connection?.finish();
        deepgramConnectionRef.current = null;
    }
    if (audioRef.current) audioRef.current.pause();
    clearTimeout(silenceTimerRef.current);
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => endConversation();
  }, [endConversation]);

  return { conversation, currentUserResponse, interimTranscript, isUserSpeaking, isAISpeaking, isListening, error, startConversation, endConversation };
} 