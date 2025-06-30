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
  
  // Refs for Media Source Extensions (MSE) Audio Player
  const audioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioChunkQueueRef = useRef([]);
  const isAppendingBufferRef = useRef(false);

  // --- AUDIO PLAYBACK (MSE) ---
  const appendNextAudioChunk = useCallback(() => {
    if (isAppendingBufferRef.current || !sourceBufferRef.current || sourceBufferRef.current.updating || audioChunkQueueRef.current.length === 0) {
      return;
    }
    isAppendingBufferRef.current = true;
    const chunk = audioChunkQueueRef.current.shift();
    try {
      sourceBufferRef.current.appendBuffer(chunk);
    } catch (e) {
      console.error("Error appending audio buffer:", e);
      isAppendingBufferRef.current = false;
    }
  }, []);

  const setupAudioPlayer = useCallback(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    audio.src = URL.createObjectURL(ms);

    ms.addEventListener('sourceopen', () => {
      try {
        const sourceBuffer = ms.addSourceBuffer('audio/mpeg');
        sourceBuffer.mode = 'sequence';
        sourceBufferRef.current = sourceBuffer;
        sourceBuffer.addEventListener('updateend', () => {
          isAppendingBufferRef.current = false;
          appendNextAudioChunk();
        });
      } catch (e) {
        console.error("Error setting up MediaSource buffer:", e);
        setError(e);
      }
    });

    audio.addEventListener('ended', () => {
      setIsAISpeaking(false);
      if (deepgramConnectionRef.current?.audioContext?.state === 'suspended') {
        deepgramConnectionRef.current.audioContext.resume();
      }
    });
  }, [appendNextAudioChunk]);

  // --- AI RESPONSE & SPEECH ---
  const generateAndSpeak = useCallback(async (prompt) => {
    setIsGenerating(true);
    setIsAISpeaking(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    // Ensure player is ready
    if (!audioRef.current || !mediaSourceRef.current) setupAudioPlayer();
    
    // Reset MediaSource for new stream if it's ended
    if (mediaSourceRef.current.readyState === 'ended') {
        // A simple way to reset is to re-create it.
        setupAudioPlayer();
        // Wait for sourceopen event
        await new Promise(resolve => mediaSourceRef.current.addEventListener('sourceopen', resolve, { once: true }));
    }

    let accumulatedText = "";
    let sentenceBuffer = "";

    try {
        const genResponse = await fetch('/api/generate-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, role: interview.jobPosition, interviewStyle: interview.interviewStyle, focus: interview.focus }),
            signal: abortControllerRef.current.signal,
        });

        if (!genResponse.ok || !genResponse.body) throw new Error('Failed to generate AI response stream');
        const textReader = genResponse.body.getReader();

        // Start playing audio as soon as the first chunk is ready
        audioRef.current.play().catch(e => console.error("Playback start failed:", e));

        while (true) {
            const { done, value } = await textReader.read();
            if (done) {
                if (sentenceBuffer.trim()) await processSentence(sentenceBuffer.trim());
                break;
            }

            const textChunk = new TextDecoder().decode(value, { stream: true });
            sentenceBuffer += textChunk;
            accumulatedText += textChunk;

            setConversation(prev => {
                const newConv = [...prev];
                const lastItem = newConv[newConv.length - 1];
                if (lastItem && lastItem.role === 'ai') {
                    lastItem.text = accumulatedText;
                }
                return newConv;
            });

            const sentenceEndIndex = sentenceBuffer.search(/[.?!]/);
            if (sentenceEndIndex !== -1) {
                const sentence = sentenceBuffer.substring(0, sentenceEndIndex + 1).trim();
                if (sentence) {
                    await processSentence(sentence);
                }
                sentenceBuffer = sentenceBuffer.substring(sentenceEndIndex + 1);
            }
        }
    } catch (err) {
        if (err.name !== 'AbortError') setError(err);
    } finally {
        setIsGenerating(false);
        const endStreamInterval = setInterval(() => {
            if (audioChunkQueueRef.current.length === 0 && !isAppendingBufferRef.current) {
                if (mediaSourceRef.current?.readyState === 'open' && !sourceBufferRef.current?.updating) {
                    mediaSourceRef.current.endOfStream();
                }
                clearInterval(endStreamInterval);
            }
        }, 100);
    }
  }, [interview, setupAudioPlayer]);

  const processSentence = useCallback(async (sentence) => {
    try {
        const ttsResponse = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sentence })
        });
        if (ttsResponse.ok && ttsResponse.body) {
            const audioReader = ttsResponse.body.getReader();
            while (true) {
                const { done, value: audioChunk } = await audioReader.read();
                if (done) break;
                audioChunkQueueRef.current.push(audioChunk);
                appendNextAudioChunk();
            }
        }
    } catch (e) {
        console.error("Error processing sentence for TTS:", e);
    }
  }, [appendNextAudioChunk]);
  
  const createPrompt = useCallback((convHistory, type) => {
    if (type === 'greeting') {
      return `You are an expert interviewer starting an interview for a ${interview.jobPosition} role. The candidate has ${interview.jobExperience} years of experience. Greet them warmly and ask your first question. Keep your opening brief and natural.`;
    }
    const history = convHistory.map(item => `${item.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${item.text}`).join('\n');
    return `This is a real-time interview for a ${interview.jobPosition} role. Here is the conversation so far:\n${history}\n\nRespond naturally to the candidate's last message. Keep your response concise and conversational.`;
  }, [interview]);

  // --- SPEECH RECOGNITION & CONVERSATION FLOW ---
  const processUserResponse = useCallback(async () => {
    const userResponse = userResponseBufferRef.current.trim();
    userResponseBufferRef.current = '';
    setCurrentUserResponse(userResponse); 
    setInterimTranscript('');
    setIsUserSpeaking(false);
    if (!userResponse) return;

    const newConversation = [...conversation, { role: 'user', text: userResponse }];
    setConversation(newConversation);
    setCurrentUserResponse(''); 

    const prompt = createPrompt(newConversation, 'response');
    setConversation(prev => [...prev, { role: 'ai', text: '' }]);
    generateAndSpeak(prompt);
  }, [conversation, createPrompt, generateAndSpeak]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    audioChunkQueueRef.current = [];
    setIsAISpeaking(false);
    setIsGenerating(false);
  }, []);
  
  const handleTranscript = useCallback((data) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (isAISpeaking) stopSpeaking();
    if (data.is_final && transcript.trim()) {
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
      }
      setIsUserSpeaking(false);
    }, 1200);
  }, [processUserResponse]);

  const startListening = useCallback(async (audioStream) => {
    if (!audioStream?.active) {
      setError(new Error("Audio stream is not active."));
      return;
    }
    try {
      const response = await fetch('/api/deepgram');
      const { deepgramToken } = await response.json();
      const deepgram = createClient(deepgramToken);
      const connection = deepgram.listen.live({
        model: "nova-2", language: "en-US", smart_format: true,
        interim_results: true, vad_events: true,
      });

      connection.on("open", () => setIsListening(true));
      connection.on("close", () => setIsListening(false));
      connection.on('error', (e) => setError(e));
      connection.on('transcript', (data) => handleTranscript(data));
      
      const audioContext = new AudioContext();
      await audioContext.audioWorklet.addModule('/audio-processor.js'); 
      const source = audioContext.createMediaStreamSource(audioStream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      workletNode.port.onmessage = (event) => {
        const audioData = event.data;
        if (!isMicMuted && connection.getReadyState() === 1 /* OPEN */) {
          connection.send(audioData);
        }
      };

      source.connect(workletNode).connect(audioContext.destination);
      deepgramConnectionRef.current = { connection, audioContext, workletNode, source };
    } catch (e) {
      setError(e);
    }
  }, [isMicMuted, handleTranscript, handleSpeechStart, handleSpeechEnd]);
  
  const stopListening = useCallback(() => {
    if (deepgramConnectionRef.current) {
        deepgramConnectionRef.current.workletNode?.port.close();
        deepgramConnectionRef.current.source?.disconnect();
        deepgramConnectionRef.current.audioContext?.close();
        deepgramConnectionRef.current.connection?.finish();
        deepgramConnectionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startConversation = useCallback(async (audioStream) => {
    startListening(audioStream);
    const prompt = createPrompt([], 'greeting');
    setConversation([{ role: 'ai', text: '' }]);
    generateAndSpeak(prompt);
  }, [startListening, createPrompt, generateAndSpeak]);

  const endConversation = useCallback(() => {
    stopListening();
    stopSpeaking();
    clearTimeout(silenceTimerRef.current);
  }, [stopListening, stopSpeaking]);

  useEffect(() => {
    setupAudioPlayer();
    return () => endConversation();
  }, [setupAudioPlayer, endConversation]);

  return { conversation, currentUserResponse, interimTranscript, isUserSpeaking, isAISpeaking, isListening, error, startConversation, endConversation };
} 