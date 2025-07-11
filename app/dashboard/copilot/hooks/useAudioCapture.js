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

            // Step 1: Get microphone stream
            microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
                video: false
            });

            // Step 2: Get display media stream with optimized settings
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    // OPTIMIZED: Better settings for screen sharing
                    echoCancellation: false,  // Disable for system audio
                    noiseSuppression: false,  // Disable for system audio
                    autoGainControl: false,   // Disable for system audio
                    sampleRate: 48000,        // Higher sample rate for screen audio
                },
                video: true
            });

            const audioTracks = displayStream.getAudioTracks();
            const videoTracks = displayStream.getVideoTracks();
            
            if (videoTracks.length > 0) {
                const videoTrack = videoTracks[0];
                const settings = videoTrack.getSettings();
                
                if (settings.displaySurface === 'monitor') {
                    console.log(`🐌 Screen Sharing: System audio quality may be limited`);
                    
                    // Try to optimize audio track for screen sharing
                    if (audioTracks.length > 0) {
                        const audioTrack = audioTracks[0];
                        try {
                            await audioTrack.applyConstraints({
                                sampleRate: 48000,
                                channelCount: 2,
                                echoCancellation: false,
                                noiseSuppression: false,
                                autoGainControl: false,
                            });
                            console.log(`🔧 Applied screen sharing audio optimizations`);
                        } catch (constraintError) {
                            console.warn(`⚠️ Could not apply audio constraints:`, constraintError);
                        }
                    }
                } else if (settings.displaySurface === 'browser') {
                    console.log(`🚀 Tab Sharing: High quality audio expected`);
                }
                
                if (settings.displaySurface === 'window') {
                    microphoneStream.getTracks().forEach(track => track.stop());
                    displayStream.getTracks().forEach(track => track.stop());
                    throw new Error("WINDOW_SHARING_NOT_ALLOWED");
                }
            }

            // Check audio availability
            if (audioTracks.length === 0) {
                console.warn("⚠️ No audio track detected - client voice will not be transcribed");
            } else {
                console.log(`🔊 Audio track detected: ${audioTracks[0].getSettings().sampleRate}Hz`);
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

            const audioTrack = displayStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.onended = () => {
                    console.log("Audio stream ended");
                    stopCapture();
                };
            }

            setIsCapturing(true);
            return { micStream: microphoneStream, tabStream: displayStream };
        } catch (err) {
            if (microphoneStream) {
                microphoneStream.getTracks().forEach(track => track.stop());
            }
            
            setIsCapturing(false);
            setMicStream(null);
            setTabStream(null);
            
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                setError(null);
                return null;
            } else if (err.message === 'WINDOW_SHARING_NOT_ALLOWED') {
                setError({ 
                    message: "❌ Window sharing is not supported. Please select a meeting tab or entire screen instead.", 
                    type: "error" 
                });
            } else {
                console.error("Error capturing audio:", err);
                setError({ message: "Failed to start capture. Please try again.", type: "error" });
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