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
  const audioQueueRef = useRef([]); // To queue audio chunks
  const isPlayingRef = useRef(false); // To track if audio is playing
  const audioRef = useRef(null);
  const deepgramConnectionRef = useRef(null);
  const abortControllerRef = useRef(null);

  // --- AI RESPONSE LOGIC ---
  const stopSpeaking = useCallback(() => {
    if (audioQueueRef.current.length > 0) {
      audioQueueRef.current = [];
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAISpeaking(false);
    setIsGenerating(false);
    isPlayingRef.current = false;
  }, []);

  const generateAndSpeak = async (prompt) => {
    setIsGenerating(true);
    setIsAISpeaking(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    let accumulatedText = "";
    let sentenceBuffer = "";

    try {
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

      if (!response.ok || !response.body) throw new Error('Failed to generate AI response stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (sentenceBuffer.trim()) {
              fetchAndQueueAudio(sentenceBuffer.trim());
            }
            break;
          }
          
          const textChunk = decoder.decode(value, { stream: true });
          sentenceBuffer += textChunk;
          accumulatedText += textChunk;

          setConversation(prev => {
              const lastItem = prev[prev.length - 1];
              if (lastItem && lastItem.role === 'ai') {
                  lastItem.text = accumulatedText;
                  return [...prev];
              }
              return [...prev, { role: 'ai', text: accumulatedText }];
          });
          
          const sentenceEndIndex = sentenceBuffer.search(/[.?!]/);
          if (sentenceEndIndex !== -1) {
            const sentence = sentenceBuffer.substring(0, sentenceEndIndex + 1).trim();
            if(sentence) {
              fetchAndQueueAudio(sentence);
            }
            sentenceBuffer = sentenceBuffer.substring(sentenceEndIndex + 1);
          }
        }
      };

      await processStream();

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error in streaming generation/speech:", err);
        setError(err);
      }
    } finally {
      setIsGenerating(false);
      const checkQueue = setInterval(() => {
        if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
          setIsAISpeaking(false);
          // Ensure mic is active after AI finishes
          if (deepgramConnectionRef.current?.audioContext?.state === 'suspended') {
            deepgramConnectionRef.current.audioContext.resume();
          }
          clearInterval(checkQueue);
        }
      }, 100);
    }
  };

  const fetchAndQueueAudio = async (text) => {
    try {
      const audioResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (audioResponse.ok) {
        const audioBlob = await audioResponse.blob();
        audioQueueRef.current.push(audioBlob);
        if (!isPlayingRef.current) playAudioQueue();
      }
    } catch (e) {
      console.error("Error fetching audio for sentence:", e);
    }
  };

  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const audioBlob = audioQueueRef.current.shift();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onended = () => {
      isPlayingRef.current = false;
      playAudioQueue(); // Play next in queue
    };
    audio.onerror = () => {
        console.error("Error playing audio.");
        isPlayingRef.current = false;
    };
    audio.play();
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
    setCurrentUserResponse(userResponse);
    setInterimTranscript('');
    setIsUserSpeaking(false);
    if (!userResponse) return;

    const newConversation = [...conversation, { role: 'user', text: userResponse }];
    setConversation(newConversation);
    setCurrentUserResponse('');

    const prompt = createPrompt(newConversation, 'response');
    generateAndSpeak(prompt);
  }, [conversation, createPrompt, generateAndSpeak]);
  
  // --- SPEECH RECOGNITION LOGIC ---
  const handleTranscript = useCallback((data) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (isAISpeaking) stopSpeaking();

    if (data.is_final && transcript.trim()) {
      userResponseBufferRef.current += transcript + ' ';
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

      const audioContext = new AudioContext();
      await audioContext.audioWorklet.addModule('/audio-processor.js'); 
      const source = audioContext.createMediaStreamSource(audioStream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

      workletNode.port.onmessage = (event) => {
        const audioData = event.data;
        if (!isMicMuted && connection.getReadyState() === 1) {
          connection.send(audioData);
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      
      deepgramConnectionRef.current = { connection, audioContext, workletNode, source };
    } catch (e) {
      console.error("X. [startListening] CRITICAL ERROR in setup:", e);
      setError(e);
    }
  }, [isMicMuted, handleTranscript, handleSpeechStart, handleSpeechEnd]);

  const stopListening = useCallback(() => {
    if (deepgramConnectionRef.current) {
      deepgramConnectionRef.current.workletNode?.port.close();
      deepgramConnectionRef.current.workletNode?.disconnect();
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
    setConversation([{role: 'ai', text: ''}]); // Initial empty AI message for streaming
    generateAndSpeak(prompt);
  }, [startListening, createPrompt, generateAndSpeak]);

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