"use client";

import { useState, useRef, useCallback } from 'react';
import { useAIResponse } from './useAIResponse';
import { useSpeechRecognition } from './useSpeechRecognition';

export function useConversationManager(interview, isMicMuted) {
  const [conversation, setConversation] = useState([]);
  const [currentUserResponse, setCurrentUserResponse] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  const userResponseBufferRef = useRef('');
  const silenceTimerRef = useRef(null);
  
  // Set up AI response generation
  const { 
    isGenerating, 
    isSpeaking: isAISpeaking, 
    generateAndSpeak, 
    stopSpeaking 
  } = useAIResponse();
  
  // Handle user speech start
  const handleSpeechStart = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    setIsUserSpeaking(true);
    if (isAISpeaking) {
      stopSpeaking();
    }
  }, [isAISpeaking, stopSpeaking]);
  
  // Handle user speech end
  const handleSpeechEnd = useCallback(() => {
    silenceTimerRef.current = setTimeout(() => {
      if (userResponseBufferRef.current.trim()) {
        processUserResponse();
      } else {
        setIsUserSpeaking(false);
      }
    }, 1500);
  }, [processUserResponse]);
  
  // Handle transcript updates
  const handleTranscriptUpdate = useCallback((transcript, isFinal) => {
    if (isAISpeaking) {
      stopSpeaking();
    }
    
    if (isFinal) {
      userResponseBufferRef.current += transcript + ' ';
      setCurrentUserResponse(userResponseBufferRef.current.trim());
      setInterimTranscript('');
    } else {
      setInterimTranscript(transcript);
    }
  }, [isAISpeaking, stopSpeaking]);
  
  // Process completed user response
  const processUserResponse = useCallback(async () => {
    const userResponse = userResponseBufferRef.current.trim();
    if (!userResponse) {
      setIsUserSpeaking(false);
      return;
    }

    setConversation(prev => [...prev, { role: 'user', text: userResponse }]);
    
    const conversationHistory = [...conversation, { role: 'user', text: userResponse }];
    const prompt = createPromptFromConversation(conversationHistory, 'response');
    const aiResponse = await generateAndSpeak(prompt, interview);
    
    if (aiResponse) {
      setConversation(prev => [...prev, { role: 'ai', text: aiResponse }]);
    }

    userResponseBufferRef.current = '';
    setCurrentUserResponse('');
    setIsUserSpeaking(false);
  }, [conversation, generateAndSpeak, interview]);
  
  // Create a prompt from conversation history
  const createPromptFromConversation = (conversationHistory, type) => {
    if (type === 'greeting') {
      return `You are conducting a job interview for a ${interview.jobPosition} position. 
              The candidate has ${interview.jobExperience} years of experience. 
              Give a brief welcome and introduction, then ask your first question.
              Keep it natural and conversational, as if you're speaking to them in person.
              This is a real-time conversation where the candidate might interrupt you,
              so keep your responses relatively brief and engaging.`;
    }
    
    // Format conversation history
    const formattedHistory = conversationHistory
      .map(item => `${item.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${item.text}`)
      .join('\n');
    
    return `The following is a real-time interview conversation between you (the interviewer) and a candidate:
            ${formattedHistory}
            
            You are interviewing for a ${interview.jobPosition} position with a ${interview.interviewStyle} style 
            and focus on ${interview.focus}.
            
            Respond naturally to what they just said. You can ask a follow-up question or move to a new topic.
            This is a real-time conversation where the candidate might interrupt you, so keep responses
            relatively brief and engaging. Make the conversation feel natural, not like a rigid Q&A session.`;
  };
  
  // Start interview with greeting
  const startConversation = async (audioStream) => {
    // Start continuous speech recognition
    startSpeechRecognition(audioStream);
    
    // Generate initial AI greeting
    const prompt = createPromptFromConversation([], 'greeting');
    const aiResponse = await generateAndSpeak(prompt, interview);
    
    if (aiResponse) {
      setConversation([{ role: 'ai', text: aiResponse }]);
    }
  };
  
  // Set up speech recognition with callbacks
  const { 
    isListening, 
    error: speechError, 
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition 
  } = useSpeechRecognition({
    onSpeechStart: handleSpeechStart,
    onSpeechEnd: handleSpeechEnd,
    onTranscript: handleTranscriptUpdate,
    muted: isMicMuted,
  });
  
  // Clean up function
  const endConversation = () => {
    stopSpeechRecognition();
    stopSpeaking();
    clearTimeout(silenceTimerRef.current);
  };
  
  return {
    conversation,
    currentUserResponse,
    interimTranscript,
    isUserSpeaking,
    isAISpeaking,
    isListening,
    speechError,
    startConversation,
    endConversation
  };
} 