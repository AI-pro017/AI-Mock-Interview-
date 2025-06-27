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
  const mediaRecorderRef = useRef(null);
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
    if (isFinal) {
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
    if (!audioStream || !audioStream.active) {
      setError(new Error("Audio stream is not active."));
      return;
    }
    try {
      const response = await fetch('/api/deepgram');
      if (!response.ok) throw new Error('Failed to get Deepgram token');
      const { deepgramToken } = await response.json();
      const deepgram = createClient(deepgramToken);
      const connection = deepgram.listen.live({
        model: "nova-2", language: "en-US", smart_format: true,
        interim_results: true, vad_events: true, utterance_end_ms: 1000,
      });

      connection.on("open", () => setIsListening(true));
      connection.on("close", () => setIsListening(false));
      connection.on('error', (e) => { console.error("Deepgram Error:", e); setError(e); });
      connection.on('transcript', handleTranscript);
      connection.on('VADEvent', (event) => {
        if (event.label === 'speech_start') handleSpeechStart();
        if (event.label === 'speech_end') handleSpeechEnd();
      });

      const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && !isMicMuted && connection.getReadyState() === 1) {
          connection.send(event.data);
        }
      };
      
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      deepgramConnectionRef.current = connection;
    } catch (e) {
      console.error("Failed to start listening:", e);
      setError(e);
    }
  }, [isMicMuted, handleTranscript, handleSpeechStart, handleSpeechEnd]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (deepgramConnectionRef.current) {
      deepgramConnectionRef.current.finish();
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

  return { conversation, currentUserResponse, interimTranscript, isUserSpeaking, isAISpeaking, isListening, error, startConversation, endConversation };
} 