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
  const audioRef = useRef(new Audio());
  const recognitionRef = useRef(null);
  const userResponseBufferRef = useRef('');
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const noSpeechErrorShownRef = useRef(false);

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
      console.log("Starting text-to-speech for:", text.substring(0, 30) + "...");
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      console.log("TTS API response status:", response.status);

      if (!response.ok) {
        let errorMessage = `Text-to-speech request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage += `: ${errorData.details || errorData.error || 'Unknown error'}`;
          console.error("TTS error details:", errorData);
        } catch (e) {
          console.error("Couldn't parse error response:", await response.text());
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      console.log("Audio blob received, size:", blob.size, "bytes");
      
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url); // Create a new Audio object with the URL

      audio.onloadedmetadata = () => console.log("Audio loaded, duration:", audio.duration);
      
      audio.onended = () => {
        console.log("Audio playback ended");
        URL.revokeObjectURL(url); // Clean up the object URL
        setIsAISpeaking(false);
      };
      
      audio.onerror = () => {
        console.error("Audio playback error:", audio.error);
        URL.revokeObjectURL(url); // Clean up
        setIsAISpeaking(false);
        // Provide a more specific error message
        setError(new Error(`Failed to play audio: ${audio.error?.message || 'MEDIA_ELEMENT_ERROR'}. Please check browser permissions.`));
      };
      
      await audio.play();
      console.log("Audio playback started successfully");
      
    } catch (err) {
      console.error("Error in text-to-speech process:", err);
      setError(new Error(`Text-to-speech error: ${err.message}`));
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

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      
      // Auto-restart if not manually stopped
      if (!isMicMuted) {
        try {
          recognition.start();
          console.log("Speech recognition restarted");
        } catch (e) {
          console.error("Failed to restart speech recognition:", e);
          // If we can't restart immediately, try again after a short delay
          setTimeout(() => {
            try {
              recognition.start();
            } catch (innerError) {
              // If it still fails, then we set listening to false
              setIsListening(false);
            }
          }, 300);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      // CRITICAL CHANGE: Only log no-speech errors, don't show them to the user
      if (event.error === 'no-speech') {
        console.log("No speech detected, continuing to listen");
        // Don't set any error state for no-speech
      } else {
        console.error("Speech recognition error:", event.error);
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