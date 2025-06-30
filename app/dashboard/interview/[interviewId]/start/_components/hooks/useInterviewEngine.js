"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

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
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const userResponseBufferRef = useRef('');
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // --- AI RESPONSE & SPEECH ---
  const generateAIResponse = useCallback(async (prompt) => {
    setIsGenerating(true);
    setError(null);
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
  
  const speakText = useCallback(async (text) => {
    if (!text || text.trim() === "") return;

    setIsAISpeaking(true);
    setError(null);
    
    try {
      // Create a new audio element
      const audio = new Audio();
      
      // Set up event handlers before setting src
      audio.onended = () => {
        console.log("Audio playback ended");
        setIsAISpeaking(false);
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsAISpeaking(false);
        setError(new Error("Failed to play audio response"));
      };
      
      // Store the element for cleanup
      audioRef.current = audio;

      console.log("Fetching TTS audio for text:", text.substring(0, 50) + "...");
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("TTS error response:", errorData);
        throw new Error(`Text-to-speech request failed with status ${response.status}: ${errorData?.error || 'Unknown error'}`);
      }
      
      console.log("TTS response received, creating blob");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Set source and play
      audio.src = url;
      
      console.log("Playing audio");
      const playPromise = audio.play();
      
      // Handle play() promise rejection (common in some browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Play promise rejected:", error);
          // Try to play again after user interaction
          const handleUserInteraction = () => {
            audio.play().catch(e => console.error("Second play attempt failed:", e));
            document.removeEventListener('click', handleUserInteraction);
          };
          document.addEventListener('click', handleUserInteraction);
        });
      }
      
    } catch (err) {
      console.error("Error in text-to-speech playback:", err);
      setError(err);
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

  // --- BROWSER SPEECH RECOGNITION ---
  const setupSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    // Browser Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(new Error("Speech recognition is not supported in this browser."));
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Increase the maxAlternatives to improve recognition
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      
      // Auto-restart if not manually stopped
      if (!isMicMuted) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          try {
            console.log("Auto-restarting speech recognition");
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition:", e);
          }
        }, 300); // Short delay before restarting
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      
      // Don't show "no-speech" errors to the user, just retry
      if (event.error === 'no-speech') {
        console.log("No speech detected, will auto-restart");
      } else {
        setError(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
        setIsUserSpeaking(true);
        // Clear any pending end-of-speech timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }

      if (final) {
        userResponseBufferRef.current += final;
        setCurrentUserResponse(userResponseBufferRef.current.trim());
        setIsUserSpeaking(true);
        
        // Set a timeout to detect end of speech
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setIsUserSpeaking(false);
          if (userResponseBufferRef.current.trim()) {
            processUserResponse();
          }
        }, 1500);
      }
    };

    return recognition;
  }, [isMicMuted, processUserResponse]);

  // --- CONVERSATION FLOW & LIFECYCLE ---
  const startConversation = useCallback(async () => {
    // Check and request microphone permission
    try {
      console.log("Requesting microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log("Microphone access granted");
    } catch (err) {
      console.error("Failed to get microphone permission:", err);
      setError(new Error("Microphone access is required for the interview. Please allow microphone access and try again."));
      return;
    }
    
    // Set up speech recognition
    const recognition = setupSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setError(new Error("Failed to start speech recognition"));
      }
    }

    // Generate AI greeting
    const prompt = createPrompt([], 'greeting');
    const aiResponseText = await generateAIResponse(prompt);

    if (aiResponseText) {
      setConversation([{ role: 'ai', text: aiResponseText }]);
      await speakText(aiResponseText);
    }
  }, [setupSpeechRecognition, createPrompt, generateAIResponse, speakText]);

  const endConversation = useCallback(() => {
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    setIsListening(false);
    setIsAISpeaking(false);
    setIsUserSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endConversation();
    };
  }, [endConversation]);

  return { 
    conversation, 
    currentUserResponse, 
    interimTranscript, 
    isUserSpeaking, 
    isAISpeaking, 
    isListening, 
    error, 
    startConversation, 
    endConversation 
  };
} 