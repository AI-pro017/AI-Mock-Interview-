"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAIResponse } from './useAIResponse';
import { useSpeechRecognition } from './useSpeechRecognition';
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
import { getRandomInterviewer } from '@/utils/interviewerProfiles';

export function useConversationManager(interview, isMicMuted, getInterviewerFn = getRandomInterviewer) {
  const [conversation, setConversation] = useState([]);
  const [currentUserResponse, setCurrentUserResponse] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [questionCounter, setQuestionCounter] = useState(0); // Track question count
  const [questionTopics, setQuestionTopics] = useState([]); // Track covered topics
  const [interviewer, setInterviewer] = useState(() => getInterviewerFn());
  
  const userResponseBufferRef = useRef('');
  const silenceTimerRef = useRef(null);
  const processUserResponseRef = useRef(null); // Add this ref to break the circular dependency
  
  // Set up AI response generation
  const { 
    isGenerating, 
    isSpeaking: isAISpeaking, 
    generateAndSpeak, 
    stopSpeaking 
  } = useAIResponse();
  
  // Handle user speech start
  const handleSpeechStart = useCallback(() => {
    console.log("SPEECH FLOW: Speech started");
    clearTimeout(silenceTimerRef.current);
    setIsUserSpeaking(true);
    if (isAISpeaking) {
      stopSpeaking();
    }
  }, [isAISpeaking, stopSpeaking]);
  
  // Handle user speech end
  const handleSpeechEnd = useCallback(() => {
    console.log("SPEECH FLOW: Speech ended");
    silenceTimerRef.current = setTimeout(() => {
      console.log("SPEECH FLOW: Silence timeout - buffer:", userResponseBufferRef.current.length > 0 ? "HAS CONTENT" : "EMPTY");
      if (userResponseBufferRef.current.trim() && processUserResponseRef.current) {
        processUserResponseRef.current(); // Use the ref instead of direct function call
      } else {
        setIsUserSpeaking(false);
      }
    }, 1500);
  }, []);  // Remove processUserResponse from dependencies
  
  // Handle transcript updates
  const handleTranscriptUpdate = useCallback((transcript, isFinal) => {
    console.log(`SPEECH FLOW: Transcript update, isFinal: ${isFinal}, length: ${transcript.length}`);
    
    if (isAISpeaking) {
      stopSpeaking();
    }
    
    if (isFinal) {
      userResponseBufferRef.current += transcript + ' ';
      console.log("SPEECH FLOW: Updated buffer:", userResponseBufferRef.current.substring(0, 50));
      setCurrentUserResponse(userResponseBufferRef.current.trim());
      setInterimTranscript('');
    } else {
      setInterimTranscript(transcript);
    }
  }, [isAISpeaking, stopSpeaking]);
  
  // Extract potential topics from the conversation
  const extractTopics = useCallback((text) => {
    // Simple implementation to extract potential keywords/topics
    // In a real implementation, this could use NLP to extract entities
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'from']);
    return words
      .filter(word => word.length > 4 && !commonWords.has(word)) // Simple filter for potential keywords
      .slice(0, 5); // Take up to 5 potential topics
  }, []);
  
  // Process completed user response
  const processUserResponse = useCallback(async () => {
    console.log("CONVERSATION FLOW: processUserResponse called");
    console.log("CONVERSATION FLOW: Current conversation length:", conversation.length);
    console.log("CONVERSATION FLOW: User response:", userResponseBufferRef.current.trim().substring(0, 50));

    const userResponse = userResponseBufferRef.current.trim();
    if (!userResponse) {
      setIsUserSpeaking(false);
      return;
    }

    // Add user's response to conversation
    setConversation(prev => [...prev, { role: 'user', text: userResponse }]);
    
    // Extract potential topics from the user's response
    const topics = extractTopics(userResponse);
    setQuestionTopics(prev => [...new Set([...prev, ...topics])]);
    
    // Find the last AI message (which should be the question)
    let lastQuestion = "";
    for (let i = conversation.length - 1; i >= 0; i--) {
      if (conversation[i].role === 'ai') {
        lastQuestion = conversation[i].text;
        break;
      }
    }
    
    console.log("CONVERSATION FLOW: Last question found:", lastQuestion ? "YES" : "NO");
    if (lastQuestion) {
      console.log("CONVERSATION FLOW: Last question:", lastQuestion.substring(0, 50));
    }
    
    // Save answer to the database
    if (lastQuestion) {
      try {
        console.log("Saving answer to database:", {
          question: lastQuestion.substring(0, 30) + "...",
          answer: userResponse.substring(0, 30) + "..."
        });
        
        // Try the original save method
        let saveSuccess = false;
        try {
          await db.insert(UserAnswer).values({
            mockIdRef: interview.mockId,
            question: lastQuestion,
            userAns: userResponse,
            userEmail: interview.createdBy || "",
            createdAt: new Date().toISOString()
          });
          saveSuccess = true;
          console.log("Answer saved successfully using direct DB insert");
        } catch (dbError) {
          console.error("Error with direct DB save:", dbError);
        }
        
        // If direct save failed, try the debug function
        if (!saveSuccess) {
          const debugSuccess = await debugSaveAnswer(
            interview.mockId, 
            lastQuestion, 
            userResponse, 
            interview.createdBy || ""
          );
          console.log("Debug save result:", debugSuccess ? "Success" : "Failed");
        }
        
      } catch (error) {
        console.error("Error saving answer to database:", error);
      }
    }
    
    const conversationHistory = [...conversation, { role: 'user', text: userResponse }];
    const prompt = createPromptFromConversation(conversationHistory, 'response');
    const aiResponse = await generateAndSpeak(prompt, interview, interviewer);
    
    if (aiResponse) {
      setConversation(prev => [...prev, { role: 'ai', text: aiResponse }]);
      
      // Check if this appears to be a new question (heuristic)
      if (aiResponse.includes('?')) {
        setQuestionCounter(prev => prev + 1);
      }
    }

    userResponseBufferRef.current = '';
    setCurrentUserResponse('');
    setIsUserSpeaking(false);
  }, [conversation, generateAndSpeak, interview, extractTopics, interviewer]);
  
  // Update the ref whenever processUserResponse changes
  useEffect(() => {
    processUserResponseRef.current = processUserResponse;
  }, [processUserResponse]);
  
  // Create a prompt from conversation history
  const createPromptFromConversation = (conversationHistory, type) => {
    if (type === 'greeting') {
      return `You are conducting a job interview for a ${interview.jobPosition} position. 
              The candidate has ${interview.jobExperience} years of experience. 
              ${interview.jobDesc ? `Job Description: ${interview.jobDesc}` : ''}
              
              Your name is ${interviewer.name} and you are a ${interviewer.title} at ${interviewer.company} ${interviewer.background}.
              Your interview style is ${interviewer.style}.
              
              Start by introducing yourself briefly as the interviewer for ${interview.jobPosition}.
              Give a warm, professional welcome and then ask your first question.
              
              If this role is technical, your first question should assess their general technical background.
              If this role is non-technical, your first question should be about their relevant experience.
              
              Keep it natural and conversational, as if you're speaking to them in person.
              This is a real-time conversation where the candidate might interrupt you,
              so keep your responses relatively brief and engaging.
              
              IMPORTANT: DO NOT use placeholder text - your name is ${interviewer.name}.`;
    }
    
    // Format conversation history
    const formattedHistory = conversationHistory
      .map(item => `${item.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${item.text}`)
      .join('\n');
    
    // Determine what type of question to ask next based on progress
    let questionStrategy = '';
    
    // Dynamically decide questioning strategy based on interview progress
    if (questionCounter < 2) {
      // Early interview: assess basics and experience
      questionStrategy = `
        You are in the early phase of the interview. Focus on understanding the candidate's background and experience.
        Ask open-ended questions about their experience with ${interview.jobPosition} roles or projects.
        If their answer was vague, ask for specific examples.
      `;
    } else if (questionCounter < 4) {
      // Middle interview: behavioral and scenario-based
      questionStrategy = `
        You are in the middle phase of the interview. Use the STAR method (Situation, Task, Action, Result) to 
        assess behavioral competencies relevant to this role.
        Ask for a specific example like "Tell me about a time when you..." related to a key skill for ${interview.jobPosition}.
        Or present a scenario: "Imagine you're facing [specific work situation], how would you handle it?"
      `;
    } else {
      // Late interview: deeper technical/specialized questions and follow-ups
      questionStrategy = `
        You are in the later phase of the interview. Go deeper into specific skills and competencies.
        Ask more challenging questions related to ${interview.focus} and specifically relevant to ${interview.jobPosition}.
        Connect your question to something they mentioned earlier to show you've been listening carefully.
      `;
    }
    
    return `The following is a real-time interview conversation between you (the interviewer) and a candidate:
            ${formattedHistory}
            
            You are ${interviewer.name}, a ${interviewer.title} at ${interviewer.company} ${interviewer.background}.
            Your interview style is ${interviewer.style}.
            You are interviewing for a ${interview.jobPosition} position with a ${interview.interviewStyle} style 
            and focus on ${interview.focus}.
            ${interview.jobDesc ? `Job Description: ${interview.jobDesc}` : ''}
            
            Current interview progress: Question #${questionCounter + 1}
            Topics already discussed: ${questionTopics.join(', ')}
            
            ${questionStrategy}
            
            Respond naturally to what they just said. Ask a relevant follow-up question or introduce a new topic
            if they've fully answered the current question.
            
            This is a real-time conversation where the candidate might interrupt you, so keep responses
            relatively brief (2-4 sentences) and engaging. Make the conversation feel natural, not like a rigid Q&A session.`;
  };
  
  // Start interview with greeting
  const startConversation = async (audioStream, selectedInterviewer = null) => {
    // If a specific interviewer is passed, use it; otherwise keep the existing one
    if (selectedInterviewer) {
      console.log("Setting interviewer from selection:", selectedInterviewer.name);
      setInterviewer(selectedInterviewer);
    }
    
    // Start continuous speech recognition
    startSpeechRecognition(audioStream);
    
    // Use a small timeout to ensure interviewer state is updated
    setTimeout(async () => {
      // Generate initial AI greeting
      const prompt = createPromptFromConversation([], 'greeting');
      const aiResponse = await generateAndSpeak(prompt, interview, selectedInterviewer || interviewer);
      
      if (aiResponse) {
        setConversation([{ role: 'ai', text: aiResponse }]);
        if (aiResponse.includes('?')) {
          setQuestionCounter(1); // Initialize with first question
        }
      }
    }, 50);
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
    
    // Return the conversation history for saving to the database
    return conversation;
  };
  
  const debugSaveAnswer = async (mockId, question, answer, userEmail) => {
    try {
      console.log("DEBUG: Saving answer to database");
      console.log("- mockId:", mockId);
      console.log("- question:", question?.substring(0, 50));
      console.log("- answer:", answer?.substring(0, 50));
      console.log("- userEmail:", userEmail);
      
      const result = await db.insert(UserAnswer).values({
        mockIdRef: mockId,
        question: question || "No question recorded",
        userAns: answer || "No answer recorded",
        userEmail: userEmail || "",
        createdAt: new Date().toISOString()
      });
      
      console.log("DEBUG: Save result:", result);
      return true;
    } catch (error) {
      console.error("DEBUG: Error saving answer:", error);
      return false;
    }
  };
  
  const forceProcessResponse = () => {
    console.log("MANUAL: Forcing process of current response");
    if (userResponseBufferRef.current.trim()) {
      processUserResponse();
    } else {
      console.log("MANUAL: No response to process");
    }
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
    endConversation,
    questionCounter,
    forceProcessResponse,
    interviewer
  };
} 