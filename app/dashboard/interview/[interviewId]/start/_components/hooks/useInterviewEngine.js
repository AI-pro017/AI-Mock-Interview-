"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export function useInterviewEngine(interview, isMicMuted, voiceSpeed = 1.0, useNaturalSpeech = true) {
  // --- STATE MANAGEMENT ---
  const [conversation, setConversation] = useState([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUserResponse, setCurrentUserResponse] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [questionPhase, setQuestionPhase] = useState('initial'); // 'initial', 'behavioral', 'technical', 'closing'
  const [questionCount, setQuestionCount] = useState(0);
  const [coveredTopics, setCoveredTopics] = useState([]);
  const [isInitialTTSLoading, setIsInitialTTSLoading] = useState(false);
  const [displayedConversation, setDisplayedConversation] = useState([]);

  // --- REFS ---
  const audioRef = useRef(new Audio());
  const recognitionRef = useRef(null);
  const userResponseBufferRef = useRef('');
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const noSpeechErrorShownRef = useRef(false);

  // First, declare processUserResponse as a ref so it can be used before definition
  const processUserResponseRef = useRef(null);

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

    // Set loading state for speech but don't set isAISpeaking yet
    setIsGenerating(true);
    setError(null);
    
    try {
      // Enhanced sanitization for TTS - fix "time equal sign" and other issues
      const sanitizedText = text
        .replace(/(\d+)\s*ms/gi, "$1 milliseconds")
        .replace(/(\d+)\s*s\b/gi, "$1 seconds")
        // Fix time equal sign issues with more robust patterns
        .replace(/[Tt]ime\s*=+\s*(\d+)/g, "time is $1")
        .replace(/([A-Za-z]+)\s*=+\s*(\d+)/g, "$1 equals $2")
        // Replace equals signs more carefully to avoid over-replacement
        .replace(/\s=\s/g, " equals ")
        .replace(/\s==\s/g, " equals ")
        .replace(/\s===\s/g, " equals ")
        .replace(/\s+/g, " ")
        .trim();
      
      console.log("Starting text-to-speech for:", sanitizedText.substring(0, 30) + "...");
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: sanitizedText,
          speed: voiceSpeed,
          naturalSpeech: useNaturalSpeech
        }),
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
      const audio = new Audio(url);
      
      // Store in the ref for potential cancellation
      audioRef.current = audio;

      audio.playbackRate = voiceSpeed;
      
      // Make sure audio is fully loaded before playing
      await new Promise((resolve) => {
        audio.onloadeddata = resolve;
        // Set a timeout in case onloadeddata doesn't fire
        const timeout = setTimeout(resolve, 3000);
        audio.onloadedmetadata = () => {
          console.log("Audio loaded, duration:", audio.duration);
          clearTimeout(timeout);
        };
      });
      
      // Now that the audio is loaded, set isAISpeaking to true
      setIsAISpeaking(true);
      setIsInitialTTSLoading(false);
      
      audio.onended = () => {
        console.log("Audio playback ended");
        URL.revokeObjectURL(url);
        setIsAISpeaking(false);
        
        // Process any pending user response when AI finishes speaking
        if (userResponseBufferRef.current.trim() && !isUserSpeaking && processUserResponseRef.current) {
          console.log("Processing pending user response after AI finished speaking");
          processUserResponseRef.current();
        }
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        
        // Safely clean up the URL
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("Error revoking URL:", err);
        }
        
        // Reset states
        setIsAISpeaking(false);
        setIsGenerating(false);
        setIsInitialTTSLoading(false);
        
        // Only set an error if we're not in the process of shutting down
        if (recognitionRef.current) {
          setError(new Error(`Failed to play audio: ${e?.message || 'MEDIA_ELEMENT_ERROR'}. Please check browser permissions.`));
        }
      };
      
      await audio.play();
      console.log("Audio playback started successfully");
      setIsGenerating(false);
      
    } catch (err) {
      console.error("Error in text-to-speech process:", err);
      setError(new Error(`Text-to-speech error: ${err.message}`));
      setIsAISpeaking(false);
      setIsGenerating(false);
      setIsInitialTTSLoading(false);
    }
  }, [voiceSpeed, useNaturalSpeech, isUserSpeaking]);

  const createPrompt = useCallback((convHistory, type) => {
    if (type === 'greeting') {
      return `You are an expert interviewer starting an interview for a ${interview.jobPosition} role. 
      The candidate has ${interview.jobExperience} years of experience. 
      
      Start by introducing yourself as the interviewer for this role.
      Greet them warmly and then ask your first question about their background or experience.
      
      Keep your response conversational and relatively brief (2-3 sentences).`;
    }
    
    // Analyze the conversation to extract topics and guide the AI
    const candidateResponses = convHistory.filter(item => item.role === 'user').map(item => item.text);
    const lastResponse = candidateResponses[candidateResponses.length - 1] || '';
    
    // Simple topic extraction (in a production app, this would use NLP)
    const potentialTopics = lastResponse
      .split(/[.,!?;]/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 15)
      .slice(0, 2);
    
    // Update interview phase based on question count
    let currentPhase = questionPhase;
    if (questionCount === 0) {
      currentPhase = 'initial';
    } else if (questionCount < 3) {
      currentPhase = 'behavioral';
    } else if (questionCount < 6) {
      currentPhase = 'technical';
    } else {
      currentPhase = 'closing';
    }
    
    // If phase changed, update state
    if (currentPhase !== questionPhase) {
      setQuestionPhase(currentPhase);
    }
    
    // Create phase-specific instructions
    let phaseInstructions = '';
    switch (currentPhase) {
      case 'initial':
        phaseInstructions = `
          You're in the initial phase of the interview. Focus on:
          - Understanding the candidate's background and experience
          - Assessing their interest in the role
          - Ask open-ended questions about their career journey
        `;
        break;
      case 'behavioral':
        phaseInstructions = `
          You're in the behavioral assessment phase. Use the STAR method approach:
          - Ask questions that prompt the candidate to describe specific Situations
          - Have them explain the Task they were responsible for
          - Get them to describe the Actions they took
          - Find out about the Results they achieved
          
          Example format: "Tell me about a time when you [faced a relevant challenge for ${interview.jobPosition}]"
        `;
        break;
      case 'technical':
        phaseInstructions = `
          You're in the technical/scenario assessment phase:
          - Present realistic work scenarios relevant to a ${interview.jobPosition}
          - Ask how they would approach specific problems
          - If their previous answer was vague, ask for more specifics
          - Connect your question to something they mentioned earlier
        `;
        break;
      case 'closing':
        phaseInstructions = `
          You're in the final phase of the interview:
          - Ask deeper questions about their career goals
          - Follow up on any points that need clarification
          - If they've mentioned interesting projects or experiences, ask for more details
          - Ask one final challenging question relevant to the ${interview.jobPosition} role
        `;
        break;
    }
    
    const history = convHistory.map(item => `${item.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${item.text}`).join('\n');
    
    return `This is a real-time interview for a ${interview.jobPosition} position. 
    The candidate has ${interview.jobExperience} years of experience.
    Interview style: ${interview.interviewStyle}
    Primary focus: ${interview.focus}
    
    Here is the conversation history:
    ${history}
    
    Current interview phase: ${currentPhase} (Question #${questionCount + 1})
    Topics already discussed: ${coveredTopics.join(', ')}
    
    Key points from their last response to follow up on:
    ${potentialTopics.map(topic => `- "${topic}"`).join('\n')}
    
    ${phaseInstructions}
    
    Respond naturally to the candidate's last message with:
    1. A brief acknowledgment of their answer (1 sentence)
    2. A follow-up question OR a new question if they've fully answered
    3. Keep your entire response under 3 sentences to maintain conversational flow
    `;
  }, [interview, questionPhase, questionCount, coveredTopics]);

  const processUserResponse = useCallback(async () => {
    // Don't process if AI is still speaking or generating content
    if (isAISpeaking || isGenerating) {
      console.log("AI is still speaking or generating, delaying response processing");
      return;
    }

    const userResponse = userResponseBufferRef.current.trim();
    userResponseBufferRef.current = '';
    setInterimTranscript('');
    setCurrentUserResponse('');
    if (!userResponse) return;

    // Update conversation with user response
    const updatedConversation = [...conversation, { role: 'user', text: userResponse }];
    setConversation(updatedConversation);
    setDisplayedConversation(updatedConversation);

    // Extract potential topics from response for tracking
    const newTopics = userResponse
      .split(' ')
      .filter(word => word.length > 5)
      .slice(0, 3);
    
    setCoveredTopics(prev => [...new Set([...prev, ...newTopics])]);

    // Ensure the AI is not already speaking before generating a new response
    if (isAISpeaking) {
      console.log("AI is already speaking, cannot generate new response yet");
      return;
    }

    // Set generating state to show loading indicator
    setIsGenerating(true);

    // Generate AI response
    const prompt = createPrompt(updatedConversation, 'response');
    const aiResponseText = await generateAIResponse(prompt);
    
    if (aiResponseText) {
      // Store the AI response in the conversation state but don't display it yet
      setConversation(prevConversation => [...prevConversation, { 
        role: 'ai', 
        text: aiResponseText,
        isLoading: true 
      }]);
      
      // If the AI is asking a question, increment the counter
      if (aiResponseText.includes('?')) {
        setQuestionCount(prev => prev + 1);
      }
      
      // Now speak the text (this will set isAISpeaking to true)
      await speakText(aiResponseText);
      
      // Only after the voice is loaded, update the displayed conversation
      setDisplayedConversation(prevConversation => [...prevConversation, { 
        role: 'ai', 
        text: aiResponseText
      }]);
      
      // Update the conversation to remove loading state
      setConversation(prevConversation => {
        const updated = [...prevConversation];
        if (updated.length > 0) {
          updated[updated.length - 1] = { 
            ...updated[updated.length - 1], 
            isLoading: false 
          };
        }
        return updated;
      });
    } else {
      setIsGenerating(false);
    }
  }, [conversation, createPrompt, generateAIResponse, speakText, setCoveredTopics, isAISpeaking, isGenerating]);

  // Store the callback function in the ref to break the circular dependency
  useEffect(() => {
    processUserResponseRef.current = processUserResponse;
  }, [processUserResponse]);

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
          // Only process the response if we have something to say AND the AI is not speaking
          if (userResponseBufferRef.current.trim() && !isAISpeaking && processUserResponseRef.current) {
            processUserResponseRef.current();
          } else if (userResponseBufferRef.current.trim() && isAISpeaking) {
            // Store the response but wait for AI to finish speaking
            console.log("Waiting for AI to finish speaking before processing response");
          }
        }, 1200); // Slightly shorter delay
      }
    };

    return recognition;
  }, [isMicMuted]);  // Remove processUserResponse dependency

  // --- LIFECYCLE & CONTROL ---
  
  // A new, dedicated shutdown function
  const shutdownEngine = useCallback(() => {
    console.log("Shutting down interview engine...");

    try {
      // 1. Stop Speech Recognition
      if (recognitionRef.current) {
        try {
          // Remove the onend handler to prevent auto-restarting
          recognitionRef.current.onend = null; 
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping speech recognition:", e);
        } finally {
          recognitionRef.current = null;
          console.log("Speech recognition stopped.");
        }
      }
      
      // 2. Properly clean up audio playback with improved error handling
      if (audioRef.current) {
        try {
          // First remove all event listeners to prevent errors
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          audioRef.current.onloadeddata = null;
          audioRef.current.onloadedmetadata = null;
          audioRef.current.onpause = null;
          audioRef.current.onplay = null;
          
          // Pause the audio before doing anything else
          audioRef.current.pause();
          
          // Set audio volume to 0 to prevent any potential sound issues
          audioRef.current.volume = 0;
          
          // Handle different browser implementations
          try {
            // Method 1: Set empty source and load
            audioRef.current.src = '';
            audioRef.current.load();
          } catch (loadError) {
            console.log("Alternative audio cleanup method used");
            // Method 2: Create a new empty audio element and replace
            audioRef.current = new Audio();
          }
          
          // Don't set audioRef.current to null yet, to prevent 
          // potential race conditions with audio event handlers
        } catch (e) {
          console.error("Error stopping audio playback:", e);
        } finally {
          console.log("Audio playback stopped.");
          // After a delay, we can safely set the ref to null
          setTimeout(() => {
            audioRef.current = null;
          }, 200);
        }
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
      setIsInitialTTSLoading(false);
      
      // 5. Clear any displayed errors related to audio
      setError(prev => {
        if (prev && prev.message && prev.message.includes('audio')) {
          return null;
        }
        return prev;
      });
    } catch (error) {
      console.error("Error during engine shutdown:", error);
      // Don't set an error state here as this could be during component unmount
    }
  }, []);

  // This useEffect properly handles mic muting with browser's SpeechRecognition
  useEffect(() => {
    // Only try to interact with recognition if it exists
    if (!recognitionRef.current) return;
    
    try {
      // If mic is muted, stop recognition if it's running
      if (isMicMuted) {
        // Check if recognition is active before stopping it
        if (isListening) {
          // Remove the onend handler to prevent auto-restarting
          const originalOnEnd = recognitionRef.current.onend;
          recognitionRef.current.onend = () => {
            setIsListening(false);
            // Restore original handler after stopping
            recognitionRef.current.onend = originalOnEnd;
          };
          
          recognitionRef.current.stop();
          console.log("Speech recognition stopped due to mute");
        }
      } else {
        // If mic is unmuted and we're not already listening, start recognition
        if (!isListening) {
          try {
            recognitionRef.current.start();
            console.log("Speech recognition started due to unmute");
          } catch (e) {
            console.error("Could not start speech recognition:", e);
            
            // If recognition is already running, don't try to restart
            if (e.name === 'InvalidStateError') {
              console.log("Recognition was already running");
              setIsListening(true);
            } else {
              // For other errors, attempt a delayed restart
              setTimeout(() => {
                try {
                  if (recognitionRef.current && !isMicMuted) {
                    recognitionRef.current.start();
                  }
                } catch (retryError) {
                  console.error("Failed to restart recognition after delay:", retryError);
                }
              }, 500);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error managing speech recognition:", error);
    }
  }, [isMicMuted, isListening]);

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
    
    // Set loading states for initial greeting
    setIsGenerating(true);
    setIsInitialTTSLoading(true);
    
    // First get the AI response text
    const initialPrompt = createPrompt([], 'greeting');
    const aiResponseText = await generateAIResponse(initialPrompt);
    
    if (aiResponseText) {
      // Store the AI response in conversation state but don't display it yet
      setConversation(prevConversation => 
        prevConversation.length === 0 
          ? [{ role: 'ai', text: aiResponseText, isLoading: true }] 
          : [...prevConversation, { role: 'ai', text: aiResponseText, isLoading: true }]
      );
      
      // Process TTS after updating the UI
      await speakText(aiResponseText);
      
      // Only after voice is loaded, update the displayed conversation
      setDisplayedConversation([{ role: 'ai', text: aiResponseText }]);
      
      // Update the conversation to remove loading state
      setConversation(prevConversation => {
        const updated = [...prevConversation];
        if (updated.length > 0) {
          updated[updated.length - 1] = { 
            ...updated[updated.length - 1], 
            isLoading: false 
          };
        }
        return updated;
      });
    } else {
      setIsGenerating(false);
      setIsInitialTTSLoading(false);
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

  // Function to manually trigger response processing
  const forceProcessResponse = useCallback(() => {
    console.log("Manual trigger of response processing");
    if (userResponseBufferRef.current.trim()) {
      console.log("Processing user response:", userResponseBufferRef.current.substring(0, 50));
      processUserResponse();
    } else if (currentUserResponse.trim()) {
      // If the buffer is empty but we have a response in the UI, use that
      console.log("Using current user response as backup:", currentUserResponse.substring(0, 50));
      userResponseBufferRef.current = currentUserResponse.trim();
      processUserResponse();
    } else {
      console.log("No user response to process");
    }
  }, [processUserResponse, currentUserResponse]);

  // Add this useEffect after the other useEffect hooks
  useEffect(() => {
    // Check if the AI stopped speaking and we have a pending user response
    if (!isAISpeaking && userResponseBufferRef.current.trim() && !isUserSpeaking) {
      console.log("AI finished speaking, now processing pending user response");
      processUserResponse();
    }
  }, [isAISpeaking, isUserSpeaking, processUserResponse]);

  return {
    conversation: displayedConversation,
    isAISpeaking,
    isUserSpeaking,
    isListening,
    currentUserResponse,
    interimTranscript,
    error,
    startConversation,
    endConversation,
    forceProcessResponse,
    isGenerating,
    isInitialTTSLoading
  };
} 