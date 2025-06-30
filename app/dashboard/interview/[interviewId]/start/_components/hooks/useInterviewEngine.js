"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

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
  const socketRef = useRef(null);
  const workletNodeRef = useRef(null);
  const abortControllerRef = useRef(null);

  // --- AI RESPONSE & SPEECH ---
  const speakText = useCallback(async (text) => {
    setIsAISpeaking(true);
    setError(null);
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
      console.error("Error converting text to speech:", err);
      setError(err);
    } finally {
      setIsAISpeaking(false);
    }
  }, []);

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
      const data = await response.json();
      return data.response;
    } catch (err) {
      console.error("Error generating AI response:", err);
      setError(err);
      return null;
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
    if (userResponseBufferRef.current.trim()) {
        processUserResponse();
    }
    setIsUserSpeaking(false);
  }, [processUserResponse]);

  const startListening = useCallback(async (audioStream) => {
    if (!socketRef.current || !audioStream.active) return;
    
    const socket = socketRef.current;
    setIsListening(true);
    socket.emit('start-transcription'); // Tell server to connect to Deepgram

    const audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule('/audio-processor.js');
    const source = audioContext.createMediaStreamSource(audioStream);
    const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
    workletNodeRef.current = { audioContext, workletNode, source };

    workletNode.port.onmessage = (event) => {
      if (socket.connected && !isMicMuted) {
        socket.emit('microphone-stream', event.data);
      }
    };
    source.connect(workletNode);
  }, [isMicMuted]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (workletNodeRef.current) {
        workletNodeRef.current.workletNode.port.close();
        workletNodeRef.current.workletNode.disconnect();
        workletNodeRef.current.source.disconnect();
        workletNodeRef.current.audioContext.close();
        workletNodeRef.current = null;
    }
  }, []);
  
  // --- CONVERSATION FLOW & LIFECYCLE ---
  const startConversation = useCallback(async (audioStream) => {
    const prompt = createPrompt([], 'greeting');
    const aiResponseText = await generateAIResponse(prompt);
    if (aiResponseText) {
      setConversation([{ role: 'ai', text: aiResponseText }]);
      await speakText(aiResponseText);
    }
    startListening(audioStream);
  }, [startListening, createPrompt, generateAIResponse, speakText]);

  const endConversation = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopListening();
    if (audioRef.current) audioRef.current.pause();
    clearTimeout(silenceTimerRef.current);
  }, [stopListening]);

  useEffect(() => {
    // Connect to the WebSocket server using an environment variable for the URL
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    socketRef.current = socket;
    
    socket.on('transcript-result', handleTranscript);
    socket.on('connect', () => console.log('🟢 Frontend connected to WebSocket server.'));
    socket.on('disconnect', () => console.log('👋 Frontend disconnected from WebSocket server.'));
    
    return () => {
      endConversation();
    };
  }, [handleTranscript, endConversation]);
  
  useEffect(() => {
    if (isListening) {
      const lastMessage = conversation[conversation.length - 1];
      const isFinal = lastMessage?.role === 'user';
      const userIsDone = isFinal && !interimTranscript;

      if (userIsDone) {
        handleSpeechEnd();
      }
    }
  }, [conversation, interimTranscript, isListening, handleSpeechEnd]);

  return { conversation, currentUserResponse, interimTranscript, isUserSpeaking, isAISpeaking, isListening, error, startConversation, endConversation };
} 