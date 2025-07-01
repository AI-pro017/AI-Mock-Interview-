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
        body: JSON.stringify({ 
          text,
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

      audio.playbackRate = voiceSpeed;
      
      audio.onloadedmetadata = () => console.log("Audio loaded, duration:", audio.duration);
      
      audio.onended = () => {
        console.log("Audio playback ended");
        URL.revokeObjectURL(url);
        setIsAISpeaking(false);
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        URL.revokeObjectURL(url);
        setIsAISpeaking(false);
        setError(new Error(`Failed to play audio: ${e?.message || 'MEDIA_ELEMENT_ERROR'}. Please check browser permissions.`));
      };
      
      await audio.play();
      console.log("Audio playback started successfully");
      
    } catch (err) {
      console.error("Error in text-to-speech process:", err);
      setError(new Error(`Text-to-speech error: ${err.message}`));
      setIsAISpeaking(false);
    }
  }, [voiceSpeed, useNaturalSpeech]);

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
    const userResponse = userResponseBufferRef.current.trim();
    userResponseBufferRef.current = '';
    setInterimTranscript('');
    setCurrentUserResponse('');
    if (!userResponse) return;

    // Update conversation with user response
    const newConversation = [...conversation, { role: 'user', text: userResponse }];
    setConversation(newConversation);

    // Extract potential topics from response for tracking
    const newTopics = userResponse
      .split(' ')
      .filter(word => word.length > 5)
      .slice(0, 3);
    
    setCoveredTopics(prev => [...new Set([...prev, ...newTopics])]);

    // Generate AI response
    const prompt = createPrompt(newConversation, 'response');
    const aiResponseText = await generateAIResponse(prompt);
    
    if (aiResponseText) {
      setConversation(prev => [...prev, { role: 'ai', text: aiResponseText }]);
      
      // If the AI is asking a question, increment the counter
      if (aiResponseText.includes('?')) {
        setQuestionCount(prev => prev + 1);
      }
      
      await speakText(aiResponseText);
    }
  }, [conversation, createPrompt, generateAIResponse, speakText, setCoveredTopics]);

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

  // This useEffect helps manage the speech recognition based on mic mute state
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isMicMuted) {
      // If the mic is muted, stop recognition
      recognitionRef.current.stop();
      console.log("Speech recognition stopped due to mute.");
    } else if (isListening) {
      // Only try to start if we're supposed to be listening
      try {
        recognitionRef.current.start();
        console.log("Speech recognition started due to unmute.");
      } catch (e) {
        // This can happen if start() is called too rapidly
        console.error("Could not restart speech recognition on unmute:", e);
      }
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