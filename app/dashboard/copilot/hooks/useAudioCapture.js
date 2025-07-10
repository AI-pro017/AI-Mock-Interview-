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
            setIsCapturing(true);

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
                
                // Block window and screen sharing completely
                if (settings.displaySurface === 'window' || settings.displaySurface === 'monitor') {
                    // Clean up streams
                    microphoneStream.getTracks().forEach(track => track.stop());
                    displayStream.getTracks().forEach(track => track.stop());
                    
                    throw new Error("WINDOW_OR_SCREEN_SHARING_NOT_ALLOWED");
                }
            }

            // Check if audio is actually captured from the tab
            if (audioTracks.length === 0) {
                // Clean up streams
                microphoneStream.getTracks().forEach(track => track.stop());
                displayStream.getTracks().forEach(track => track.stop());
                
                throw new Error("NO_TAB_AUDIO");
            }

            setMicStream(microphoneStream);
            setTabStream(displayStream);

            // Handle stream end events
            const videoTrack = displayStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    console.log("Display stream ended");
                    stopCapture();
                };
            }

            return { micStream: microphoneStream, tabStream: displayStream };
        } catch (err) {
            // Clean up microphone stream if it was created
            if (microphoneStream) {
                microphoneStream.getTracks().forEach(track => track.stop());
                microphoneStream = null;
            }
            
            // Reset state
            setIsCapturing(false);
            setMicStream(null);
            setTabStream(null);
            
            // Handle different error types
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                // User cancelled the screen sharing dialog - don't log or show error
                // Just silently reset and let user try again
                setError(null);
                return null;
            } else if (err.message === 'WINDOW_OR_SCREEN_SHARING_NOT_ALLOWED') {
                setError({ 
                    message: "❌ Window and screen sharing are not supported. Please select a Chrome meeting tab instead.", 
                    type: "error" 
                });
            } else if (err.message === 'NO_TAB_AUDIO') {
                setError({ 
                    message: "❌ No audio detected from the selected tab. Please select a tab with audio (like a meeting) and check 'Share tab audio' when prompted.", 
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
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            setMicStream(null);
        }
        if (tabStream) {
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