"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const audioStreamRef = useRef(null);
  
  const startListening = useCallback(async (audioStream) => {
    if (!audioStream || !audioStream.active) {
      const e = new Error("Cannot start speech recognition: The provided audio stream is not active.");
      console.error(e);
      setError(e);
      return;
    }

    // Store the audio stream for mute control
    audioStreamRef.current = audioStream;
    
    setError(null);

    try {
      const response = await fetch('/api/deepgram');
      if (!response.ok) throw new Error('Failed to get Deepgram token');
      
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

      connection.on("open", () => setIsListening(true));
      connection.on("close", () => setIsListening(false));
      connection.on('error', (e) => {
        console.error("Deepgram Error:", e);
        setError(e);
      });

      connection.on('transcript', (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript) {
          onTranscript?.(transcript, data.is_final);
          if (data.is_final && transcript.trim()) {
            onFinalTranscript?.(transcript);
          }
        }
      });

      connection.on('VADEvent', (event) => {
        if (event.label === 'speech_start') onSpeechStart?.();
        if (event.label === 'speech_end') onSpeechEnd?.();
      });

      // Ensure the recorder is stopped before creating a new one
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      // Only create and start the MediaRecorder if not muted
      if (!muted) {
        const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && !muted && enabled && deepgramConnectionRef.current) {
            try {
              deepgramConnectionRef.current.send(event.data);
            } catch (e) {
              console.error("Failed to send audio data:", e);
            }
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        // Start recording
        mediaRecorder.start(250);
      }

      deepgramConnectionRef.current = connection;

    } catch (e) {
      console.error("Failed to start listening:", e);
      setError(e);
    }
  }, [muted, onSpeechStart, onSpeechEnd, onTranscript, onFinalTranscript, enabled]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (deepgramConnectionRef.current) {
      deepgramConnectionRef.current.finish();
      deepgramConnectionRef.current = null;
    }
    clearTimeout(silenceTimerRef.current);
    setIsListening(false);
  }, []);

  // Handle muting changes
  useEffect(() => {
    // If we have a stream but mute state changed
    if (audioStreamRef.current) {
      try {
        // Get all audio tracks and update their enabled state
        const audioTracks = audioStreamRef.current.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = !muted;
          console.log(`Audio track ${track.label} ${muted ? 'muted' : 'unmuted'}`);
        });
        
        // Also handle the recorder based on mute state
        if (muted) {
          // Stop recording if muted
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            console.log("Media recorder stopped due to mute");
          }
        } else if (deepgramConnectionRef.current) {
          // Start recording if unmuted and connection exists
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
            try {
              const mediaRecorder = new MediaRecorder(audioStreamRef.current, { mimeType: 'audio/webm' });
              
              mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && !muted && enabled && deepgramConnectionRef.current) {
                  try {
                    deepgramConnectionRef.current.send(event.data);
                  } catch (sendError) {
                    console.error("Failed to send audio data:", sendError);
                  }
                }
              };
              
              mediaRecorderRef.current = mediaRecorder;
              mediaRecorder.start(250);
              console.log("Media recorder started after unmute");
            } catch (e) {
              console.error("Failed to restart recording after unmute:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error handling mute state change:", error);
      }
    }
  }, [muted, enabled]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopListening();
    };
  }, [stopListening]);
  
  return {
    isListening,
    error,
    startListening,
    stopListening
  };
} 