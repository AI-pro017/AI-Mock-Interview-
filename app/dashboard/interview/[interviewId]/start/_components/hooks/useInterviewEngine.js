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
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      
      // Always update the live, interim transcript
      setInterimTranscript(interim);

      if (interim) {
        setIsUserSpeaking(true);
        // Clear any pending end-of-speech timeout as long as the user is talking
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }

      if (final) {
        // A final result has arrived.
        // 1. Add it to our permanent buffer for this turn.
        userResponseBufferRef.current += final;
        
        // 2. Update the UI to show the full, finalized text for this turn.
        setCurrentUserResponse(userResponseBufferRef.current.trim());

        // 3. IMPORTANT: Clear the live/interim transcript display.
        setInterimTranscript('');
        
        // 4. Set a timeout to detect the end of speech.
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setIsUserSpeaking(false);
          // Only process the response if we have something to say
          if (userResponseBufferRef.current.trim()) {
            processUserResponse();
          }
        }, 1200); // Slightly shorter delay
      }
    };

    return recognition;
  }, [isMicMuted, processUserResponse]);

  // --- LIFECYCLE & CONTROL ---
  
  // A new, dedicated shutdown function
  const shutdownEngine = useCallback(() => {
    console.log("Shutting down interview engine...");

    // 1. Stop Speech Recognition
    if (recognitionRef.current) {
      // Remove the onend handler to prevent auto-restarting
      recognitionRef.current.onend = null; 
      recognitionRef.current.stop();
      recognitionRef.current = null;
      console.log("Speech recognition stopped.");
    }
    
    // 2. Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; // Clear source
      console.log("Audio playback stopped.");
    }

    // 3. Clear all timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // 4. Reset all state flags
    setIsAISpeaking(false);
    setIsUserSpeaking(false);
    setIsListening(false);
    setIsGenerating(false);
  }, []);

  // This new useEffect hook manages the mute state
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isMicMuted) {
      // If the mic is muted, stop recognition
      recognitionRef.current.stop();
      console.log("Speech recognition stopped due to mute.");
    } else {
      // If the mic is unmuted, start recognition
      try {
        recognitionRef.current.start();
        console.log("Speech recognition started due to unmute.");
      } catch (e) {
        // This can happen if start() is called too rapidly
        console.error("Could not restart speech recognition on unmute:", e);
      }
    }
  }, [isMicMuted]); // This hook runs only when isMicMuted changes

  const startConversation = useCallback(async (mediaStream) => {
    const recognition = setupSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        setError(new Error("Could not start speech recognition. Please check microphone permissions."));
        return;
      }
    }
    
    const initialPrompt = createPrompt([], 'greeting');
    const aiResponseText = await generateAIResponse(initialPrompt);
    if (aiResponseText) {
      setConversation([{ role: 'ai', text: aiResponseText }]);
      await speakText(aiResponseText);
    }
  }, [setupSpeechRecognition, createPrompt, generateAIResponse, speakText]);

  // This function is now just a public-facing wrapper for shutdown
  const endConversation = useCallback(() => {
    shutdownEngine();
  }, [shutdownEngine]);

  // CRITICAL: This useEffect hook handles component unmount
  useEffect(() => {
    // Return a cleanup function that will be called when the component unmounts
    return () => {
      shutdownEngine();
    };
  }, [shutdownEngine]); // Dependency array ensures this is stable

  return {
    conversation,
    isAISpeaking,
    isUserSpeaking,
    isListening,
    currentUserResponse,
    interimTranscript,
    error,
    startConversation,
    endConversation,
  };
} 