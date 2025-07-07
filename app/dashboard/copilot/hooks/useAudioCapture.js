"use client";

import { useState, useCallback } from 'react';

export const useAudioCapture = () => {
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);

    const startCapture = useCallback(async () => {
        try {
            // This captures both video and audio from the selected tab
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000, // Good for transcription
                },
                video: true, // Crucial for capturing the tab content
            });
            
            setStream(displayStream);
            setError(null);
            return displayStream;
        } catch (err) {
            console.error("Error capturing display:", err);
            if (err.name === 'NotAllowedError') {
                setError("Permission to capture your screen was denied. You must grant access to use the copilot.");
            } else {
                setError("An error occurred while trying to capture the screen.");
            }
            return null;
        }
    }, []);

    const stopCapture = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    return { stream, error, startCapture, stopCapture };
}; 