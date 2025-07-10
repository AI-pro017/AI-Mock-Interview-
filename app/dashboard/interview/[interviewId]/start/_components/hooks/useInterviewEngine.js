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
  const [questionPhase, setQuestionPhase] = useState('initial');
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

  const processUserResponseRef = useRef(null);
  const shouldUnmuteRef = useRef(false);
  const initializeSpeechRecognitionRef = useRef(null);
  const shutdownSpeechRecognitionRef = useRef(null);

  // Define shutdownSpeechRecognition BEFORE initializeSpeechRecognition
  const shutdownSpeechRecognition = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onstart = null;
        
        try {
          recognitionRef.current.abort();
        } catch (e) {
          try {
            recognitionRef.current.stop();
          } catch (innerError) {
            // Silent fallback
          }
        }
        
        recognitionRef.current = null;
      }
      
      setIsListening(false);
      userResponseBufferRef.current = '';
      setCurrentUserResponse('');
      setInterimTranscript('');
      setIsUserSpeaking(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      return true;
    } catch (e) {
      setIsListening(false);
      return false;
    }
  }, []);

  shutdownSpeechRecognitionRef.current = shutdownSpeechRecognition;

  const initializeSpeechRecognition = useCallback(() => {
    if (shutdownSpeechRecognitionRef.current) {
      shutdownSpeechRecognitionRef.current();
    }
    
    setTimeout(() => {
      try {
        if (typeof window === 'undefined') return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setError(new Error("Speech recognition is not supported in this browser."));
          return;
        }
        
        if (recognitionRef.current) {
          return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onend = () => {
          if (!isAISpeaking && !isMicMuted) {
            try {
              recognition.start();
            } catch (e) {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };
        
        recognition.onerror = (event) => {
          if (event.error === 'no-speech') {
            // Continue listening
          } else if (event.error === 'aborted') {
            // Expected when AI speaks
          } else {
            // Handle other errors silently
          }
        };
        
        recognition.onresult = (event) => {
          if (isAISpeaking) {
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
        
        recognitionRef.current = recognition;
        
        try {
          recognition.start();
          return true;
        } catch (e) {
          return false;
        }
      } catch (e) {
        return false;
      }
    }, 100);
  }, [isAISpeaking, isMicMuted]);

  initializeSpeechRecognitionRef.current = initializeSpeechRecognition;

  // --- AI RESPONSE & SPEECH ---
  const generateAIResponse = useCallback(async (prompt, customInterviewer = null) => {
    setIsGenerating(true);
    setError(null);
    try {
      const interviewerToUse = customInterviewer || interviewer;
      
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          role: interview.jobPosition, 
          interviewStyle: interview.interviewStyle, 
          focus: interview.focus,
          interviewer: interviewerToUse
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate AI response');
      const data = await response.json();
      return data.response;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [interview, interviewer]);
  
  const speakText = useCallback(async (text, gender = null, isFirstUtterance = false) => {
    if (!text || text.trim() === "") return;

    setIsGenerating(true);
    setError(null);
    
    if (shutdownSpeechRecognitionRef.current) {
      shutdownSpeechRecognitionRef.current();
    }
    
    userResponseBufferRef.current = '';
    setCurrentUserResponse('');
    setInterimTranscript('');
    
    try {
      const sanitizedText = text
        .replace(/<break[^>]*>/g, '')
        .replace(/<speak>|<\/speak>/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/(\d+)\s*ms/gi, "$1 milliseconds")
        .replace(/(\d+)\s*s\b/gi, "$1 seconds")
        .replace(/[Tt]ime\s*=+\s*(\d+)/g, "time is $1")
        .replace(/([A-Za-z]+)\s*=+\s*(\d+)/g, "$1 equals $2")
        .replace(/\s=\s/g, " equals ")
        .replace(/\s==\s/g, " equals ")
        .replace(/\s===\s/g, " equals ")
        .replace(/\s+/g, " ")
        .trim();
      
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
      
      const responseVoiceId = response.headers.get('x-voice-id');
      
      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error("Received empty audio data from TTS API");
      }
      
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audioRef.current = audio;
      audio.playbackRate = voiceSpeed;
      
      await new Promise((resolve, reject) => {
        audio.onloadeddata = resolve;
        audio.onerror = (e) => reject(new Error(`Audio load error: ${e.toString()}`));
        const timeout = setTimeout(() => {
          resolve();
        }, 3000);
        
        audio.onloadedmetadata = () => {
          clearTimeout(timeout);
        };
      });
      
      setIsAISpeaking(true);
      setIsInitialTTSLoading(false);
      setIsGenerating(false);
      
      try {
        await audio.play();
      } catch (playError) {
        throw new Error(`Failed to play audio: ${playError.message}`);
      }
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsAISpeaking(false);
      };
      
      return responseVoiceId;
      
    } catch (err) {
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
    
    const candidateResponses = convHistory.filter(item => item.role === 'user').map(item => item.text);
    const lastResponse = candidateResponses[candidateResponses.length - 1] || '';
    
    const potentialTopics = lastResponse
      .split(/[.,!?;]/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 15)
      .slice(0, 2);
    
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
    
    if (currentPhase !== questionPhase) {
      setQuestionPhase(currentPhase);
    }
    
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
    if (isAISpeaking || isGenerating) {
      return;
    }

    const userResponse = userResponseBufferRef.current.trim();
    userResponseBufferRef.current = '';
    setInterimTranscript('');
    setCurrentUserResponse('');
    if (!userResponse) return;

    const updatedConversation = [...conversation, { role: 'user', text: userResponse }];
    setConversation(updatedConversation);
    setDisplayedConversation(updatedConversation);

    const newTopics = userResponse
      .split(' ')
      .filter(word => word.length > 5)
      .slice(0, 3);
    
    setCoveredTopics(prev => [...new Set([...prev, ...newTopics])]);

    if (isAISpeaking) {
      return;
    }

    setIsGenerating(true);

    const prompt = createPrompt(updatedConversation, 'response');
    const aiResponseText = await generateAIResponse(prompt);
    
    if (aiResponseText) {
      setConversation(prevConversation => [...prevConversation, { 
        role: 'ai', 
        text: aiResponseText,
        isLoading: true 
      }]);
      
      if (aiResponseText.includes('?')) {
        setQuestionCount(prev => prev + 1);
      }
      
      await speakText(aiResponseText);
      
      setDisplayedConversation(prevConversation => [...prevConversation, { 
        role: 'ai', 
        text: aiResponseText
      }]);
      
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

  useEffect(() => {
    processUserResponseRef.current = processUserResponse;
  }, [processUserResponse]);

  // --- BROWSER SPEECH RECOGNITION ---
  const setupSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
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
      setIsListening(true);
    };

    recognition.onend = () => {
      if (!isAISpeaking && !isMicMuted) {
        setTimeout(() => {
          if (!isAISpeaking && !isMicMuted && recognition) {
            try {
              recognition.start();
            } catch (e) {
              if (e.name === 'InvalidStateError' && e.message.includes('already started')) {
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
      if (event.error === 'no-speech') {
        // Continue listening
      } else if (event.error === 'aborted') {
        // Expected when AI speaks
      } else if (event.error === 'network') {
        // Don't set error state as this might be temporary
      } else {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(new Error(`Speech recognition error: ${event.error}`));
        }
      }
    };

    recognition.onresult = (event) => {
      if (isAISpeaking) {
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

    return recognition;
  }, [isAISpeaking, isMicMuted]);

  // --- LIFECYCLE & CONTROL ---
  
  const shutdownEngine = useCallback(() => {
    try {
      if (recognitionRef.current) {
        if (shutdownSpeechRecognitionRef.current) {
          shutdownSpeechRecognitionRef.current();
        }
      }
      
      if (audioRef.current) {
        try {
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
          audioRef.current.onloadeddata = null;
          audioRef.current.onloadedmetadata = null;
          audioRef.current.onpause = null;
          audioRef.current.onplay = null;
          
          audioRef.current.pause();
          audioRef.current.volume = 0;
          
          try {
            audioRef.current.src = '';
            audioRef.current.load();
          } catch (loadError) {
            audioRef.current = new Audio();
          }
          
          setTimeout(() => {
            audioRef.current = null;
          }, 200);
        } catch (e) {
          // Silent error handling
        }
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      setIsAISpeaking(false);
      setIsUserSpeaking(false);
      setIsListening(false);
      setIsGenerating(false);
      setIsInitialTTSLoading(false);
      setIsActiveInterview(false);
      
      setError(prev => {
        if (prev && prev.message && prev.message.includes('audio')) {
          return null;
        }
        return prev;
      });
    } catch (error) {
      // Silent error handling during shutdown
    }
  }, []);

  useEffect(() => {
    if (isMicMuted) {
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    } else if (isActiveInterview && !isAISpeaking) {
      const timer = setTimeout(() => {
        if (!recognitionRef.current) {
          if (initializeSpeechRecognitionRef.current) {
            initializeSpeechRecognitionRef.current();
          }
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isMicMuted, isActiveInterview, isAISpeaking]);
  
  const autoUnmute = useCallback(() => {
    if (isMicMuted) {
      if (setIsMicMutedExternal) {
        setIsMicMutedExternal(false);
      } else {
        shouldUnmuteRef.current = true;
      }
    }
  }, [isMicMuted, setIsMicMutedExternal]);

  useEffect(() => {
    if (isAISpeaking) {
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    } else if (isActiveInterview) {
      autoUnmute();
      
      const timer = setTimeout(() => {
        if (initializeSpeechRecognitionRef.current) {
          initializeSpeechRecognitionRef.current();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isAISpeaking, isActiveInterview]);

  useEffect(() => {
    if (isInitialTTSLoading || (isGenerating && !isAISpeaking)) {
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    }
  }, [isInitialTTSLoading, isGenerating, isAISpeaking]);

  useEffect(() => {
    if (!isActiveInterview) {
      if (shutdownSpeechRecognitionRef.current) {
        shutdownSpeechRecognitionRef.current();
      }
    }
  }, [isActiveInterview]);

  const startConversation = useCallback(async (audioStream, selectedInterviewer = null) => {
    setIsInitialTTSLoading(true);
    
    if (shutdownSpeechRecognitionRef.current) {
      shutdownSpeechRecognitionRef.current();
    }
    
    const interviewerToUse = selectedInterviewer || (getInterviewerFn ? getInterviewerFn() : interviewer);
    
    setInterviewer(interviewerToUse);
    
    const prompt = createPrompt([], 'greeting', interviewerToUse);
    const aiResponse = await generateAIResponse(prompt, interviewerToUse);
    
    if (aiResponse) {
      setConversation([{ role: 'ai', text: aiResponse }]);
      
      const gender = interviewerToUse?.gender || 'female';
      const voiceIdResponse = await speakText(aiResponse, gender, true);
      
      if (voiceIdResponse) {
        setSelectedVoiceId(voiceIdResponse);
      }
      
      setDisplayedConversation([{ role: 'ai', text: aiResponse }]);
      
      if (aiResponse.includes('?')) {
        setQuestionCount(1);
      }
    } else {
      setIsInitialTTSLoading(false);
    }
    setIsActiveInterview(true);
  }, [createPrompt, generateAIResponse, speakText, getInterviewerFn, interviewer, shutdownSpeechRecognitionRef]);

  const endConversation = useCallback(() => {
    shutdownEngine();
  }, [shutdownEngine]);

  useEffect(() => {
    return () => {
      shutdownEngine();
    };
  }, [shutdownEngine]);

  const forceProcessResponse = useCallback(() => {
    if (userResponseBufferRef.current.trim()) {
      processUserResponse();
    } else if (currentUserResponse.trim()) {
      userResponseBufferRef.current = currentUserResponse.trim();
      processUserResponse();
    }
  }, [processUserResponse, currentUserResponse]);

  useEffect(() => {
    if (!isAISpeaking && userResponseBufferRef.current.trim() && !isUserSpeaking) {
      processUserResponse();
    }
  }, [isAISpeaking, isUserSpeaking, processUserResponse]);

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

  const safelyControlRecognition = useCallback((shouldBeActive) => {
    if (shouldBeActive) {
      if (!isListening) {
        try {
          if (!recognitionRef.current) {
            recognitionRef.current = setupSpeechRecognition();
          }
          
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (e) {
            if (e.name === 'InvalidStateError' && e.message.includes('already started')) {
              setIsListening(true);
            } else {
              return false;
            }
          }
          
          return true;
        } catch (e) {
          return false;
        }
      } else {
        return true;
      }
    } else {
      if (isListening && recognitionRef.current) {
        try {
          const originalOnEnd = recognitionRef.current.onend;
          recognitionRef.current.onend = () => {
            setIsListening(false);
            recognitionRef.current.onend = originalOnEnd;
          };
          
          recognitionRef.current.stop();
          return true;
        } catch (e) {
          setIsListening(false);
          return false;
        }
      } else {
        return true;
      }
    }
  }, [isListening, setupSpeechRecognition]);

  useEffect(() => {
    if (isAISpeaking) {
      safelyControlRecognition(false);
      
      userResponseBufferRef.current = '';
      setCurrentUserResponse('');
      setInterimTranscript('');
    } else if (!isMicMuted) {
      const timer = setTimeout(() => {
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