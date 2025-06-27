"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@deepgram/sdk';

export function useSpeechRecognition({
  onSpeechStart,
  onSpeechEnd,
  onTranscript,
  onFinalTranscript,
  enabled = true,
  muted = false
}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  const deepgramConnectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const silenceTimerRef = useRef(null);
  
  // Start listening with Deepgram
  const startListening = async (audioStream) => {
    if (!audioStream) return;
    
    try {
      const response = await fetch('/api/deepgram');
      if (!response.ok) {
        throw new Error('Failed to get Deepgram token');
      }
      
      const data = await response.json();
      const { deepgramToken } = data;
      
      const deepgram = createClient(deepgramToken);
      const connection = deepgram.listen.live({
        model: "nova-2",
        language: "en-US",
        smart_format: true,
        interim_results: true,
        vad_events: true,
        utterance_end_ms: 1000,
        endpointing: 200
      });
      
      // Set up MediaRecorder to capture audio
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && !muted && enabled) {
          connection.send(event.data);
        }
      };
      
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle connection events
      connection.on("open", () => {
        setIsListening(true);
        setError(null);
      });
      
      // Handle speech transcripts
      connection.on('transcript', (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        
        if (transcript) {
          // Pass the transcript to the callback
          onTranscript?.(transcript, data.is_final);
          
          if (data.is_final) {
            onFinalTranscript?.(transcript);
          }
        }
      });
      
      // Handle Voice Activity Detection events
      connection.on('VADEvent', (event) => {
        if (event.label === 'speech_start') {
          onSpeechStart?.();
          clearTimeout(silenceTimerRef.current);
        }
        
        if (event.label === 'speech_end') {
          // Start silence timer
          silenceTimerRef.current = setTimeout(() => {
            onSpeechEnd?.();
          }, 1500);
        }
      });
      
      // Handle errors and connection close
      connection.on('error', (error) => {
        console.error("Deepgram connection error:", error);
        setError(error);
        setIsListening(false);
      });
      
      connection.on('close', () => {
        setIsListening(false);
      });
      
      // Store the connection
      deepgramConnectionRef.current = connection;
      
    } catch (error) {
      console.error("Error setting up Deepgram:", error);
      setError(error);
      setIsListening(false);
    }
  };
  
  // Stop listening
  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (deepgramConnectionRef.current) {
      deepgramConnectionRef.current.finish();
    }
    
    clearTimeout(silenceTimerRef.current);
    setIsListening(false);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);
  
  return {
    isListening,
    error,
    startListening,
    stopListening
  };
} 