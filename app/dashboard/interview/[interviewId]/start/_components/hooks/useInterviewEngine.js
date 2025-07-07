"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConversationManager } from './useConversationManager';

export function useInterviewEngine(interview, isMicMuted, voiceSpeed = 1.0, useNaturalSpeech = true, getInterviewerFn, setIsMicMutedExternal = null) {
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
  const [interviewer, setInterviewer] = useState(getInterviewerFn ? getInterviewerFn() : null);
  const [selectedVoiceId, setSelectedVoiceId] = useState(null);
  const [isActiveInterview, setIsActiveInterview] = useState(false);

  // --- REFS ---
  const audioRef = useRef(new Audio());
  const recognitionRef = useRef(null);
  const userResponseBufferRef = useRef('');
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const noSpeechErrorShownRef = useRef(false);

  // First, declare processUserResponse as a ref so it can be used before definition
  const processUserResponseRef = useRef(null);

  // Track if we should unmute in a ref
  const shouldUnmuteRef = useRef(false);

  // First, create a ref for the function so it can be referenced before definition
  const initializeSpeechRecognitionRef = useRef(null);

  // Add a ref for the shutdownSpeechRecognition function at the beginning
  const shutdownSpeechRecognitionRef = useRef(null);

  // Define shutdownSpeechRecognition BEFORE initializeSpeechRecognition
  const shutdownSpeechRecognition = useCallback(() => {
    console.log("COMPLETELY shutting down speech recognition");
    
    try {
      if (recognitionRef.current) {
        // First, completely remove all event handlers to prevent any processing
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        
        // Then try to abort (preferred) or stop recognition
        try {
          recognitionRef.current.abort();
        } catch (e) {
          try {
            recognitionRef.current.stop();
          } catch (innerError) {
            console.log("Could not stop recognition, but continuing cleanup");
          }
        }
        
        // Finally, set the reference to null to ensure complete cleanup
        recognitionRef.current = null;
      }
      
      // Update state and clear buffers
      setIsListening(false);
      userResponseBufferRef.current = '';
      setCurrentUserResponse('');
      setInterimTranscript('');
      setIsUserSpeaking(false);
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      return true;
    } catch (e) {
      console.error("Error during speech recognition shutdown:", e);
      setIsListening(false);
      return false;
    }
  }, []);

  // Store the function in the ref for other code to use
  shutdownSpeechRecognitionRef.current = shutdownSpeechRecognition;

  // Now modify initializeSpeechRecognition to use the ref instead of direct reference
  const initializeSpeechRecognition = useCallback(() => {
    console.log("Initializing new speech recognition");
    
    // First, ensure nothing is running - use the ref to avoid circular dependency
    if (shutdownSpeechRecognitionRef.current) {
      shutdownSpeechRecognitionRef.current();
    }
    
    // Wait a moment to ensure complete cleanup
    setTimeout(() => {
      try {
        if (typeof window === 'undefined') return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setError(new Error("Speech recognition is not supported in this browser."));
          return;
        }
        
        // Only create a new instance if one doesn't exist
        if (recognitionRef.current) {
          console.log("Recognition instance already exists, not creating a new one");
          return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Set up event handlers with improved error handling
        recognition.onstart = () => {
          console.log("Speech recognition started successfully");
          setIsListening(true);
        };
        
        recognition.onend = () => {
          console.log("Speech recognition ended");
          
          // Only auto-restart if not in AI speaking mode and not muted
          if (!isAISpeaking && !isMicMuted) {
            try {
              recognition.start();
              console.log("Speech recognition auto-restarted");
            } catch (e) {
              console.error("Failed to auto-restart speech recognition:", e);
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };
        
        recognition.onerror = (event) => {
          if (event.error === 'no-speech') {
            console.log("No speech detected, continuing to listen");
          } else if (event.error === 'aborted') {
            console.log("Speech recognition was aborted");
          } else {
            console.error("Speech recognition error:", event.error);
          }
        };
        
        recognition.onresult = (event) => {
          // Extra safety check - never process results if AI is speaking
          if (isAISpeaking) {
            console.log("CRITICAL: Ignoring speech results while AI is speaking");
            return;
          }
          
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
          
          setInterimTranscript(interim);
          
          if (interim) {
            setIsUserSpeaking(true);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
          
          if (final) {
            userResponseBufferRef.current += final;
            setCurrentUserResponse(userResponseBufferRef.current.trim());
            setInterimTranscript('');
            
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
              setIsUserSpeaking(false);
              if (userResponseBufferRef.current.trim() && processUserResponseRef.current) {
                processUserResponseRef.current();
              }
            }, 1200);
          }
        };
        
        // Store the recognition instance
        recognitionRef.current = recognition;
        
        // Start it
        try {
          recognition.start();
          console.log("NEW speech recognition started successfully");
          return true;
        } catch (e) {
          console.error("Error starting new speech recognition:", e);
          return false;
        }
      } catch (e) {
        console.error("Error initializing speech recognition:", e);
        return false;
      }
    }, 100); // Short delay for cleanup
  }, [isAISpeaking, isMicMuted]); // Remove shutdownSpeechRecognition from dependencies

  // Store the function in the ref for other code to use
  initializeSpeechRecognitionRef.current = initializeSpeechRecognition;

  // --- AI RESPONSE & SPEECH ---
  const generateAIResponse = useCallback(async (prompt, customInterviewer = null) => {
    setIsGenerating(true);
    setError(null);
    try {
      // Use the provided interviewer if available, otherwise fall back to state
      const interviewerToUse = customInterviewer || interviewer;
      
      console.log("Generating AI response using interviewer:", interviewerToUse.name);
      
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          role: interview.jobPosition, 
          interviewStyle: interview.interviewStyle, 
          focus: interview.focus,
          interviewer: interviewerToUse // Use the explicit interviewer
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
  }, [interview, interviewer]); // Keep the same dependencies
  
  const speakText = useCallback(async (text, gender = null, isFirstUtterance = false) => {
    if (!text || text.trim() === "") return;

    // Set loading state for speech
    setIsGenerating(true);
    setError(null);
    
    // IMPORTANT: Shut down speech recognition BEFORE AI starts speaking
    if (shutdownSpeechRecognitionRef.current) {
      shutdownSpeechRecognitionRef.current();
    }
    
    // Clear any pending user input when AI starts speaking
    userResponseBufferRef.current = '';
    setCurrentUserResponse('');
    setInterimTranscript('');
    
    try {
      // Enhanced sanitization for TTS - fix "time equal sign" and other issues
      const sanitizedText = text
        .replace(/<break[^>]*>/g, '')
        .replace(/<speak>|<\/speak>/g, '')
        .replace(/<[^>]*>/g, '')
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
      console.log("Using gender:", gender || interviewer?.gender || 'female');
      console.log("Using voice ID:", selectedVoiceId || "None (will be selected)");
      
      // Use the interviewer's gender if none provided
      const voiceGender = gender || interviewer?.gender || 'female';
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: sanitizedText,
          speed: voiceSpeed,
          naturalSpeech: useNaturalSpeech,
          gender: voiceGender,
          voiceId: selectedVoiceId,
          selectNewVoice: isFirstUtterance || !selectedVoiceId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Text-to-speech request failed: ${errorText}`);
      }
      
      // Check if the response has a voice ID header
      const responseVoiceId = response.headers.get('x-voice-id');
      if (responseVoiceId && (isFirstUtterance || !selectedVoiceId)) {
        console.log("Received voice ID from header:", responseVoiceId);
        // We'll return this at the end of the function
      }
      
      // Get the response as a blob
      const blob = await response.blob();
      console.log("Audio blob received, size:", blob.size, "bytes");
      
      // Check if we have a valid audio blob
      if (!blob || blob.size === 0) {
        throw new Error("Received empty audio data from TTS API");
      }
      
      // Create URL from blob
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      // Store in ref for potential cancellation
      audioRef.current = audio;
      
      // Set playback rate
      audio.playbackRate = voiceSpeed;
      
      // Make sure audio is fully loaded before playing
      await new Promise((resolve, reject) => {
        audio.onloadeddata = resolve;
        audio.onerror = (e) => reject(new Error(`Audio load error: ${e.toString()}`));
        // Set a timeout in case onloadeddata doesn't fire
        const timeout = setTimeout(() => {
          resolve(); // Resolve anyway after timeout
          console.warn("Audio load timeout, continuing anyway");
        }, 3000);
        
        audio.onloadedmetadata = () => {
          console.log("Audio loaded, duration:", audio.duration);
          clearTimeout(timeout);
        };
      });
      
      // Now that audio is loaded, update states
      setIsAISpeaking(true);
      setIsInitialTTSLoading(false);
      setIsGenerating(false);
      
      // Play the audio
      try {
        await audio.play();
        console.log("Audio playback started successfully");
      } catch (playError) {
        console.error("Audio play error:", playError);
        throw new Error(`Failed to play audio: ${playError.message}`);
      }
      
      // Set up event handlers for completion
      audio.onended = () => {
        console.log("Audio playback ended");
        URL.revokeObjectURL(url);
        setIsAISpeaking(false);
        
        // Let the useEffect handle starting speech recognition
      };
      
      // Return the voice ID if we got one
      return responseVoiceId;
      
    } catch (err) {
      console.error("Error in text-to-speech process:", err);
      setError(new Error(`Text-to-speech error: ${err.message}`));
      setIsAISpeaking(false);
      setIsGenerating(false);
      setIsInitialTTSLoading(false);
      return null;
    }
  }, [voiceSpeed, useNaturalSpeech, isUserSpeaking, interviewer, selectedVoiceId]);

  const createPrompt = useCallback((convHistory, type, customInterviewer = null) => {
    const interviewerToUse = customInterviewer || interviewer;
    
    if (type === 'greeting') {
      return `You are an expert interviewer starting an interview for a ${interview.jobPosition} role. 
      The candidate has ${interview.jobExperience} years of experience. 
      
      IMPORTANT: Your name is ${interviewerToUse.name} and you are a ${interviewerToUse.title} at ${interviewerToUse.company} ${interviewerToUse.background || ''}.
      Your interview style is ${interviewerToUse.style}.
      
      Start by introducing yourself as ${interviewerToUse.name} from ${interviewerToUse.company}.
      Greet them warmly and then ask your first question about their background or experience.
      
      Keep your response conversational and relatively brief (2-3 sentences).
      
      CRITICAL REQUIREMENT: You MUST introduce yourself as ${interviewerToUse.name} and mention your role at ${interviewerToUse.company}. 
      DO NOT use any other name or company. DO NOT invent a different identity.`;
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
      
      // Now speak the text with the current interviewer
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
  }, [conversation, createPrompt, generateAIResponse, speakText, setCoveredTopics, isAISpeaking, isGenerating, interviewer]);

  // Store the callback function in the ref to break the circular dependency
  useEffect(() => {
    processUserResponseRef.current = processUserResponse;
  }, [processUserResponse]);

  // --- BROWSER SPEECH RECOGNITION ---
  const setupSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(new Error("Speech recognition is not supported in this browser."));
      return null;
    }

    console.log("Creating new speech recognition instance");
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("Speech recognition started successfully");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      
      // Only auto-restart if AI isn't speaking and mic isn't muted
      if (!isAISpeaking && !isMicMuted) {
        // Use a delay to prevent rapid restart attempts
        setTimeout(() => {
          if (!isAISpeaking && !isMicMuted && recognition) {
            try {
              recognition.start();
              console.log("Speech recognition auto-restarted");
            } catch (e) {
              console.error("Failed to auto-restart speech recognition:", e);
              
              if (e.name === 'InvalidStateError' && e.message.includes('already started')) {
                console.log("Recognition already started, which is fine");
                setIsListening(true);
              } else {
                setIsListening(false);
              }
            }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      // Handle different error types appropriately
      if (event.error === 'no-speech') {
        console.log("No speech detected, continuing to listen");
      } else if (event.error === 'aborted') {
        console.log("Speech recognition was aborted - this is expected when AI speaks");
      } else if (event.error === 'network') {
        console.error("Network error in speech recognition");
        // Don't set error state as this might be temporary
      } else {
        console.error("Speech recognition error:", event.error);
        // Only set error for critical errors
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(new Error(`Speech recognition error: ${event.error}`));
        }
      }
    };

    recognition.onresult = (event) => {
      // Ignore results if AI is speaking (this is a safety measure)
      if (isAISpeaking) {
        console.log("Ignoring speech results while AI is speaking");
        return;
      }
      
      // Process speech results as normal
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
      
      // Update state with transcripts
      setInterimTranscript(interim);
      if (interim) {
        setIsUserSpeaking(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }

      if (final) {
        userResponseBufferRef.current += final;
        setCurrentUserResponse(userResponseBufferRef.current.trim());
        setInterimTranscript('');
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setIsUserSpeaking(false);
          if (userResponseBufferRef.current.trim() && processUserResponseRef.current) {
            processUserResponseRef.current();
          }
        }, 1200);
      }
    };

    return recognition;
  }, [isAISpeaking, isMicMuted]); // Include these in dependencies

  // --- LIFECYCLE & CONTROL ---
  
  // A new, dedicated shutdown function
  const shutdownEngine = useCallback(() => {
    console.log("Shutting down interview engine...");

    try {
      // 1. Stop Speech Recognition
      if (recognitionRef.current) {
        if (shutdownSpeechRecognitionRef.current) {
          shutdownSpeechRecognitionRef.current();
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
      setIsActiveInterview(false);
      
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
    console.log("Microphone mute state changed:", isMicMuted ? "muted" : "unmuted");
    
    if (isMicMuted) {
      // When muting, always ensure speech recognition is completely shut down
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    } else if (isActiveInterview && !isAISpeaking) {
      // Only restart speech recognition if the interview is active and AI is not speaking
      
      // Add a small delay to ensure proper cleanup before restarting
      const timer = setTimeout(() => {
        // Only try to initialize if recognition isn't already running
        if (!recognitionRef.current) {
          console.log("Initializing speech recognition after unmute");
          // Use the ref function instead of direct reference
          if (initializeSpeechRecognitionRef.current) {
            initializeSpeechRecognitionRef.current();
          }
        } else {
          console.log("Speech recognition is already running, no need to restart");
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isMicMuted, isActiveInterview, isAISpeaking]); // Remove initializeSpeechRecognition from deps
  
  // Modify the autoUnmute callback to use the external setter if available
  const autoUnmute = useCallback(() => {
    if (isMicMuted) {
      console.log("Auto-unmuting microphone after AI finished speaking");
      if (setIsMicMutedExternal) {
        // If we have a setter, use it
        setIsMicMutedExternal(false);
      } else {
        // Otherwise, just set a flag for the parent to check
        shouldUnmuteRef.current = true;
      }
    }
  }, [isMicMuted, setIsMicMutedExternal]);

  // Now update the AI speaking effect
  useEffect(() => {
    console.log("AI speaking state changed:", isAISpeaking);
    
    if (isAISpeaking) {
      // AI started speaking - COMPLETELY shut down speech recognition
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    } else if (isActiveInterview) {
      // AI stopped speaking during an active interview
      
      // 1. Auto-unmute if needed
      autoUnmute();
      
      // 2. Initialize speech recognition with a short delay
      const timer = setTimeout(() => {
        // Use the ref function instead of direct reference
        if (initializeSpeechRecognitionRef.current) {
          initializeSpeechRecognitionRef.current();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isAISpeaking, isActiveInterview]); // Remove initializeSpeechRecognition from deps

  // Add this effect to disable speech recognition during initial loading
  useEffect(() => {
    if (isInitialTTSLoading || (isGenerating && !isAISpeaking)) {
      console.log("Loading state detected - disabling speech recognition");
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    }
  }, [isInitialTTSLoading, isGenerating, isAISpeaking]);

  // Add a new useEffect to handle pre-interview state
  useEffect(() => {
    // If interview is not active yet, ensure speech recognition is off
    if (!isActiveInterview) {
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    }
  }, [isActiveInterview]);

  // Then use it in startConversation
  const startConversation = useCallback(async (audioStream, selectedInterviewer = null) => {
    // Set loading state
    setIsInitialTTSLoading(true);
    
    // Explicitly shut down speech recognition during loading
    if (shutdownSpeechRecognitionRef.current) {
      shutdownSpeechRecognitionRef.current();
    }
    
    // Store the current interviewer to use throughout this function
    const interviewerToUse = selectedInterviewer || (getInterviewerFn ? getInterviewerFn() : interviewer);
    
    console.log("Starting interview with interviewer:", interviewerToUse.name);
    
    // Update interviewer state for future responses
    setInterviewer(interviewerToUse);
    
    // Generate initial AI greeting - pass interviewer directly
    const prompt = createPrompt([], 'greeting', interviewerToUse);
    
    // Pass the interviewer directly to generateAIResponse
    const aiResponse = await generateAIResponse(prompt, interviewerToUse);
    
    if (aiResponse) {
      // Update conversation state
      setConversation([{ role: 'ai', text: aiResponse }]);
      
      // For the first utterance, get a voice ID back
      const gender = interviewerToUse?.gender || 'female';
      const voiceIdResponse = await speakText(aiResponse, gender, true);
      
      // Save voice ID if returned
      if (voiceIdResponse) {
        setSelectedVoiceId(voiceIdResponse);
      }
      
      // Update displayed conversation
      setDisplayedConversation([{ role: 'ai', text: aiResponse }]);
      
      if (aiResponse.includes('?')) {
        setQuestionCount(1);
      }
    } else {
      setIsInitialTTSLoading(false);
    }
    setIsActiveInterview(true);
  }, [createPrompt, generateAIResponse, speakText, getInterviewerFn, interviewer, shutdownSpeechRecognitionRef]);

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

  // Pass the interviewer selection function to the conversation manager
  const {
    conversation: convo,
    currentUserResponse: convoCurrentUserResponse,
    interimTranscript: convoInterimTranscript,
    isUserSpeaking: convoIsUserSpeaking,
    isAISpeaking: convoIsAISpeaking,
    isListening: convoIsListening,
    speechError: convoSpeechError,
    startConversation: startConvo,
    endConversation: endConvo,
    questionCounter,
    forceProcessResponse: convoForceProcessResponse,
    interviewer: convoInterviewer
  } = useConversationManager(interview, isMicMuted, getInterviewerFn);

  // Add a helper function to safely start/stop speech recognition
  const safelyControlRecognition = useCallback((shouldBeActive) => {
    if (shouldBeActive) {
      // Should be active - start it if it's not already running
      if (!isListening) {
        try {
          // Create new instance if needed
          if (!recognitionRef.current) {
            recognitionRef.current = setupSpeechRecognition();
          }
          
          // Check if it's already started (this is a real issue)
          let isAlreadyStarted = false;
          try {
            // This is a hack to check if recognition is already started
            // If it's already started, this will throw an InvalidStateError
            recognitionRef.current.start();
            console.log("Speech recognition started successfully");
            setIsListening(true);
          } catch (e) {
            if (e.name === 'InvalidStateError' && e.message.includes('already started')) {
              console.log("Recognition was already started - updating state only");
              isAlreadyStarted = true;
              setIsListening(true);
            } else {
              // Some other error
              console.error("Error starting speech recognition:", e);
              return false;
            }
          }
          
          return true;
        } catch (e) {
          console.error("Error setting up speech recognition:", e);
          return false;
        }
      } else {
        // Already listening, no action needed
        return true;
      }
    } else {
      // Should be inactive - stop it if it's running
      if (isListening && recognitionRef.current) {
        try {
          // Prevent auto-restart
          const originalOnEnd = recognitionRef.current.onend;
          recognitionRef.current.onend = () => {
            setIsListening(false);
            // Restore original handler after execution
            recognitionRef.current.onend = originalOnEnd;
          };
          
          recognitionRef.current.stop();
          console.log("Speech recognition stopped successfully");
          return true;
        } catch (e) {
          console.error("Error stopping speech recognition:", e);
          // Force the state to match reality
          setIsListening(false);
          return false;
        }
      } else {
        // Already not listening, no action needed
        return true;
      }
    }
  }, [isListening, setupSpeechRecognition]);

  // 2. Now use this helper in our effect that handles AI speaking state
  useEffect(() => {
    if (isAISpeaking) {
      // AI is speaking - stop recognition and clear buffer
      console.log("AI is speaking - stopping speech recognition");
      
      // Stop speech recognition
      safelyControlRecognition(false);
      
      // Clear any buffered speech
      userResponseBufferRef.current = '';
      setCurrentUserResponse('');
      setInterimTranscript('');
    } else if (!isMicMuted) {
      // AI stopped speaking and mic isn't muted - start recognition
      console.log("AI stopped speaking - starting speech recognition");
      
      // Use a delay to ensure clean transition
      const timer = setTimeout(() => {
        // Start speech recognition
        safelyControlRecognition(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isAISpeaking, isMicMuted, safelyControlRecognition]);

  return {
    conversation: displayedConversation,
    currentUserResponse,
    interimTranscript,
    isUserSpeaking,
    isAISpeaking,
    isListening,
    error,
    startConversation,
    endConversation,
    isGenerating,
    isInitialTTSLoading,
    forceProcessResponse,
    interviewer,
    shouldUnmute: shouldUnmuteRef.current
  };
} 