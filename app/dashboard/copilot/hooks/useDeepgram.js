"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export const useDeepgram = (stream, token, speakerIdentifier) => {
    const [transcript, setTranscript] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const resetTimeoutRef = useRef(null);

    const disconnect = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }
        setIsConnected(false);
        setTranscript(null);
    }, []);

    // Reset connection after client finishes speaking
    const scheduleReset = useCallback(() => {
        if (speakerIdentifier === 'client') {
            // Clear any existing reset timeout
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }
            
            // Schedule reset 2 seconds after final transcript
            resetTimeoutRef.current = setTimeout(() => {
                console.log(`🔄 [${speakerIdentifier}] Auto-resetting after final transcript to prevent buffer buildup`);
                
                const currentStream = stream;
                const currentToken = token;
                
                disconnect();
                
                // Reconnect after brief delay
                setTimeout(() => {
                    if (currentStream && currentToken) {
                        connect();
                    }
                }, 500);
            }, 2000); // Reset 2 seconds after final transcript
        }
    }, [speakerIdentifier, stream, token]);
    
    const connect = useCallback(() => {
        if (!token || !stream) return;

        disconnect();

        const queryParams = [
            "model=nova-2",
            "interim_results=true",
            "smart_format=true",
            "diarize=true",
            "utterance_end_ms=3000",
            "vad_turnoff=500"
        ].join('&');
        
        const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${queryParams}`, ['token', token]);

        socket.onopen = () => {
            setIsConnected(true);
            console.log(`🔗 [${speakerIdentifier}] Connected to Deepgram`);

            if (stream && stream.getAudioTracks().length > 0) {
                const activeAudioTracks = stream.getAudioTracks().filter(track => track.readyState === 'live');
                
                if (activeAudioTracks.length > 0) {
                    try {
                        const recorder = new MediaRecorder(stream);
                        
                        recorder.ondataavailable = (event) => {
                            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                                socket.send(event.data);
                            }
                        };
                        
                        recorder.onerror = (error) => {
                            console.error(`[${speakerIdentifier}] MediaRecorder error:`, error);
                            disconnect();
                        };
                        
                        mediaRecorderRef.current = recorder;
                        recorder.start(100);
                        
                        console.log(`🎙️ [${speakerIdentifier}] Recording started`);
                    } catch (error) {
                        console.error(`[${speakerIdentifier}] Failed to start MediaRecorder:`, error);
                        disconnect();
                    }
                } else {
                    console.warn(`[${speakerIdentifier}] No active audio tracks available`);
                    disconnect();
                }
            } else {
                console.warn(`[${speakerIdentifier}] Stream is not available or has no audio tracks`);
                if (speakerIdentifier === 'client') {
                    socket.close();
                } else {
                    disconnect();
                }
            }
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'Results') {
                const transcript = data.channel?.alternatives?.[0]?.transcript || '';
                const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
                const timestamp = new Date().toLocaleTimeString();
                
                if (transcript.trim()) {
                    console.log(`✅ [${speakerIdentifier}] ${timestamp}: "${transcript}" (${confidence.toFixed(2)}) ${data.is_final ? '[FINAL]' : '[INTERIM]'}`);
                    
                    // SOLUTION: Schedule reset after client's final transcript
                    if (speakerIdentifier === 'client' && data.is_final) {
                        console.log(`🎯 [${speakerIdentifier}] Final transcript received - scheduling reset`);
                        scheduleReset();
                    }
                } else if (confidence > 0) {
                    console.log(`⚠️ [${speakerIdentifier}] Audio detected but empty transcript (confidence: ${confidence.toFixed(2)})`);
                }
                
                setTranscript({ ...data, speakerIdentifier });
            }
        };

        socket.onclose = (event) => {
            console.log(`🔒 [${speakerIdentifier}] WebSocket closed: ${event.code} - ${event.reason}`);
            setIsConnected(false);
        };

        socket.onerror = (error) => {
            console.error(`❌ [${speakerIdentifier}] Deepgram WebSocket error:`, error);
        };

        socketRef.current = socket;

    }, [stream, token, speakerIdentifier, disconnect, scheduleReset]);

    useEffect(() => {
        if (stream && token) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [stream, token, connect, disconnect]);

    return { transcript, isConnected };
};