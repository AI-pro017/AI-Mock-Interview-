"use client";

import { useState, useCallback } from 'react';

export const useAudioCapture = () => {
    const [micStream, setMicStream] = useState(null);
    const [tabStream, setTabStream] = useState(null);
    const [error, setError] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCapture = useCallback(async () => {
        let microphoneStream = null;
        
        try {
            setError(null);
            // Don't set isCapturing to true yet - wait until streams are established

            // Step 1: Get microphone stream (for user audio)
            microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
                video: false
            });

            // Step 2: Get display media stream (for tab audio + video)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
                video: {
                    mediaSource: 'tab'
                }
            });

            // Check what type of sharing was selected
            const audioTracks = displayStream.getAudioTracks();
            const videoTracks = displayStream.getVideoTracks();
            
            if (videoTracks.length > 0) {
                const videoTrack = videoTracks[0];
                const settings = videoTrack.getSettings();
                
                // Block only window sharing, allow tab and screen sharing
                if (settings.displaySurface === 'window') {
                    // Clean up streams
                    microphoneStream.getTracks().forEach(track => track.stop());
                    displayStream.getTracks().forEach(track => track.stop());
                    
                    throw new Error("WINDOW_SHARING_NOT_ALLOWED");
                }
            }

            // Audio is optional - if no audio, system will work without transcription
            // We'll just log a warning but continue with capture
            if (audioTracks.length === 0) {
                const videoTrack = videoTracks[0];
                const settings = videoTrack?.getSettings();
                
                if (settings?.displaySurface === 'browser') {
                    console.warn("No audio detected from tab - transcription will be disabled");
                } else {
                    console.warn("No audio detected from screen - transcription will be disabled");
                }
            }

            // Set streams first
            setMicStream(microphoneStream);
            setTabStream(displayStream);

            // Handle stream end events - when display sharing stops, stop everything
            const videoTrack = displayStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    console.log("Display stream ended - stopping entire capture session");
                    stopCapture();
                };
            }
            
            // Also handle audio track end events
            const audioTrack = displayStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.onended = () => {
                    console.log("Display audio stream ended - stopping entire capture session");
                    stopCapture();
                };
            }

            // Only set isCapturing to true after everything is successfully set up
            console.log("Capture setup complete - setting isCapturing to true");
            setIsCapturing(true);

            return { micStream: microphoneStream, tabStream: displayStream };
        } catch (err) {
            // Clean up microphone stream if it was created
            if (microphoneStream) {
                microphoneStream.getTracks().forEach(track => track.stop());
                microphoneStream = null;
            }
            
            // Reset state - ensure isCapturing is false
            console.log("Error during capture setup - resetting state");
            setIsCapturing(false);
            setMicStream(null);
            setTabStream(null);
            
            // Handle different error types
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                // User cancelled the screen sharing dialog - don't log or show error
                // Just silently reset and let user try again
                setError(null);
                return null;
            } else if (err.message === 'WINDOW_SHARING_NOT_ALLOWED') {
                setError({ 
                    message: "❌ Window sharing is not supported. Please select a meeting tab or entire screen instead.", 
                    type: "error" 
                });
            } else if (err.message === 'NO_TAB_AUDIO') {
                setError({ 
                    message: "❌ No audio detected from the selected tab. Please select a tab with audio (like a meeting) and check 'Share tab audio' when prompted.", 
                    type: "error" 
                });
            } else if (err.message === 'NO_SCREEN_AUDIO') {
                setError({ 
                    message: "❌ No audio detected from screen sharing. Please check 'Share system audio' when prompted for screen sharing.", 
                    type: "error" 
                });
            } else {
                // Log only actual errors, not user cancellations
                console.error("Error capturing audio:", err);
                
                if (err.name === 'NotFoundError') {
                    setError({ message: "No microphone found. Please check your audio devices.", type: "error" });
                } else if (err.name === 'InvalidStateError') {
                    setError({ message: "Cannot start capture. Please try again.", type: "error" });
                } else if (err.name === 'NotSupportedError') {
                    setError({ message: "Screen sharing is not supported in this browser.", type: "error" });
                } else {
                    setError({ message: "Failed to start capture. Please try again.", type: "error" });
                }
            }
            return null;
        }
    }, []);

    const stopCapture = useCallback(() => {
        console.log("stopCapture called - cleaning up all streams");
        if (micStream) {
            console.log("Stopping microphone stream");
            micStream.getTracks().forEach(track => track.stop());
            setMicStream(null);
        }
        if (tabStream) {
            console.log("Stopping tab/display stream");
            tabStream.getTracks().forEach(track => track.stop());
            setTabStream(null);
        }
        setIsCapturing(false);
        setError(null);
    }, [micStream, tabStream]);

    return { 
        micStream, 
        tabStream, 
        error, 
        isCapturing,
        startCapture, 
        stopCapture 
    };
}; 