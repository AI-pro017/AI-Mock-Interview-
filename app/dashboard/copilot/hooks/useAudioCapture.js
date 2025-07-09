"use client";

import { useState, useCallback } from 'react';

export const useAudioCapture = () => {
    const [micStream, setMicStream] = useState(null);
    const [tabStream, setTabStream] = useState(null);
    const [error, setError] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const startCapture = useCallback(async () => {
        try {
            setError(null);
            setIsCapturing(true);

            // Step 1: Get microphone stream (for user audio)
            const microphoneStream = await navigator.mediaDevices.getUserMedia({
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
                video: true
            });

            // Check if audio is actually captured from the tab
            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error("No audio track found in the selected tab. Please make sure to select a tab with audio and check 'Share tab audio' when prompted.");
            }

            setMicStream(microphoneStream);
            setTabStream(displayStream);

            // Handle stream end events
            displayStream.getVideoTracks()[0].onended = () => {
                stopCapture();
            };

            return { micStream: microphoneStream, tabStream: displayStream };
        } catch (err) {
            console.error("Error capturing audio:", err);
            setIsCapturing(false);
            
            if (err.name === 'NotAllowedError') {
                setError({ message: "Permission denied. Please allow access to microphone and screen sharing." });
            } else if (err.name === 'NotFoundError') {
                setError({ message: "No microphone found. Please check your audio devices." });
            } else if (err.message.includes('audio track')) {
                setError({ message: err.message });
            } else {
                setError({ message: "Failed to start audio capture. Please try again." });
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