"use client";

import { useState, useRef } from 'react';

export function useAIResponse() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0); // Default speed is 1.0
  const [useNaturalSpeech, setUseNaturalSpeech] = useState(true); // Enable natural speech by default
  
  const audioRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Generate AI response based on conversation context
  const generateResponse = async (prompt, interviewDetails, interviewer = null) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Create an abort controller to allow cancellation
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      console.log("Generating response with interviewer:", interviewer ? interviewer.name : "default");
      
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          role: interviewDetails.jobPosition,
          interviewStyle: interviewDetails.interviewStyle,
          focus: interviewDetails.focus,
          // Pass the interviewer information
          interviewer: interviewer ? {
            name: interviewer.name,
            title: interviewer.title,
            company: interviewer.company,
            background: interviewer.background,
            style: interviewer.style
          } : null,
          // Additional context for the AI to make better decisions
          conversationContext: {
            jobExperience: interviewDetails.jobExperience,
            industry: interviewDetails.industry || '',
            skills: interviewDetails.skills || '',
            difficulty: interviewDetails.difficulty || 'Medium'
          }
        }),
        signal
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate AI response');
      }
      
      const data = await response.json();
      setIsGenerating(false);
      return data.response;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('AI response generation aborted');
      } else {
        console.error("Error generating AI response:", error);
        setError(error);
      }
      setIsGenerating(false);
      return null;
    }
  };
  
  // Convert text to speech using ElevenLabs
  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      setError(null);
      
      // Create an abort controller for the TTS request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          speed: voiceSpeed,
          naturalSpeech: useNaturalSpeech
        }),
        signal
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Store reference to allow interruption
      audioRef.current = audio;
      
      // Handle audio ending
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      // Play the audio with the selected playback rate
      audio.playbackRate = voiceSpeed;
      await audio.play();
      
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('TTS generation aborted');
      } else {
        console.error("Error converting text to speech:", error);
        setError(error);
      }
      setIsSpeaking(false);
      return false;
    }
  };
  
  // Interrupt ongoing speech
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsSpeaking(false);
    setIsGenerating(false);
  };
  
  // Combined function to generate response and speak it
  const generateAndSpeak = async (prompt, interviewDetails, interviewer = null) => {
    const aiResponse = await generateResponse(prompt, interviewDetails, interviewer);
    if (aiResponse) {
      await speakText(aiResponse);
      return aiResponse;
    }
    return null;
  };
  
  return {
    isGenerating,
    isSpeaking,
    error,
    generateResponse,
    speakText,
    stopSpeaking,
    generateAndSpeak,
    voiceSpeed,
    setVoiceSpeed,
    useNaturalSpeech,
    setUseNaturalSpeech
  };
} 