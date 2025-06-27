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
      const data = await response.json();
      return data.response;
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
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play();
      });
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
  const handleTranscript = useCallback((transcript, isFinal) => {
    if (isAISpeaking) stopSpeaking();
    if (isFinal && transcript.trim()) {
      userResponseBufferRef.current += transcript + ' ';
      setCurrentUserResponse(userResponseBufferRef.current.trim());
      setInterimTranscript('');
    } else {
      setInterimTranscript(transcript);
    }
  }, [isAISpeaking, stopSpeaking]);

  const handleSpeechStart = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    setIsUserSpeaking(true);
    if (isAISpeaking) stopSpeaking();
  }, [isAISpeaking, stopSpeaking]);

  const handleSpeechEnd = useCallback(() => {
    silenceTimerRef.current = setTimeout(() => {
      if (userResponseBufferRef.current.trim()) {
        processUserResponse();
      } else {
        setIsUserSpeaking(false);
      }
    }, 1200);
  }, [processUserResponse]);

  const startListening = useCallback(async (audioStream) => {
    console.log("1. [startListening] Attempting to start speech recognition...");

    if (!audioStream || !audioStream.active) {
      const e = new Error("Audio stream is not active.");
      console.error("1a. [startListening] ERROR:", e);
      setError(e);
      return;
    }

    try {
      console.log("2. [startListening] Fetching Deepgram token...");
      const response = await fetch('/api/deepgram');
      if (!response.ok) throw new Error('Failed to get Deepgram token');
      const { deepgramToken } = await response.json();
      console.log("2a. [startListening] Deepgram token received.");

      const deepgram = createClient(deepgramToken);
      const connection = deepgram.listen.live({
        model: "nova-2", language: "en-US", smart_format: true,
        interim_results: true, vad_events: true, utterance_end_ms: 1000,
        encoding: 'linear16', sample_rate: 16000,
      });

      connection.on("open", () => {
        console.log("3. [Deepgram] Connection OPENED successfully.");
        setIsListening(true);
      });
      connection.on("close", () => {
        console.log("X. [Deepgram] Connection CLOSED.");
        setIsListening(false);
      });
      connection.on('error', (e) => { 
        console.error("X. [Deepgram] ERROR:", e); 
        setError(e); 
      });
      connection.on('transcript', handleTranscript);
      connection.on('VADEvent', (event) => {
        if (event.label === 'speech_start') handleSpeechStart();
        if (event.label === 'speech_end') handleSpeechEnd();
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(audioStream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);

      processor.onaudioprocess = (e) => {
        if (isMicMuted || connection.getReadyState() !== 1) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(inputData, audioContext.sampleRate, 16000);
        const int16 = new Int16Array(downsampled.length);

        for (let i = 0; i < downsampled.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, downsampled[i] * 32767));
        }
        
        connection.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      
      deepgramConnectionRef.current = { connection, audioContext, processor, source };
    } catch (e) {
      console.error("X. [startListening] CRITICAL ERROR in setup:", e);
      setError(e);
    }
  }, [isMicMuted, handleTranscript, handleSpeechStart, handleSpeechEnd]);

  const stopListening = useCallback(() => {
    if (deepgramConnectionRef.current) {
      deepgramConnectionRef.current.processor?.disconnect();
      deepgramConnectionRef.current.source?.disconnect();
      deepgramConnectionRef.current.audioContext?.close();
      deepgramConnectionRef.current.connection?.finish();
      deepgramConnectionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // --- CONVERSATION FLOW ---
  const startConversation = useCallback(async (audioStream) => {
    startListening(audioStream);
    const prompt = createPrompt([], 'greeting');
    const aiResponseText = await generateAIResponse(prompt);
    if (aiResponseText) {
      setConversation([{ role: 'ai', text: aiResponseText }]);
      await speakText(aiResponseText);
    }
  }, [startListening, createPrompt, generateAIResponse, speakText]);

  const endConversation = useCallback(() => {
    stopListening();
    stopSpeaking();
    clearTimeout(silenceTimerRef.current);
  }, [stopListening, stopSpeaking]);

  useEffect(() => {
    return () => endConversation();
  }, [endConversation]);

  // Helper function for resampling audio
  const downsampleBuffer = (buffer, inputSampleRate, outputSampleRate) => {
      if (inputSampleRate === outputSampleRate) {
          return buffer;
      }
      const sampleRateRatio = inputSampleRate / outputSampleRate;
      const newLength = Math.round(buffer.length / sampleRateRatio);
      const result = new Float32Array(newLength);
      let offsetResult = 0;
      let offsetBuffer = 0;
      while (offsetResult < result.length) {
          const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
          let accum = 0, count = 0;
          for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
              accum += buffer[i];
              count++;
          }
          result[offsetResult] = accum / count;
          offsetResult++;
          offsetBuffer = nextOffsetBuffer;
      }
      return result;
  };

  return { conversation, currentUserResponse, interimTranscript, isUserSpeaking, isAISpeaking, isListening, error, startConversation, endConversation };
} 