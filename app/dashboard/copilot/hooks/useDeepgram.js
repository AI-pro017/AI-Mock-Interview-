"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export const useDeepgram = (stream, token, speakerIdentifier) => {
    const [transcript, setTranscript] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    const disconnect = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setIsConnected(false);
    }, []);
    
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

            if (stream.getAudioTracks().length > 0) {
                const recorder = new MediaRecorder(stream);
                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                        socket.send(event.data);
                    }
                };
                mediaRecorderRef.current = recorder;
                recorder.start(100);
            }
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.channel?.alternatives?.[0]?.transcript) {
                setTranscript({ ...data, speakerIdentifier });
            }
        };

        socket.onclose = (event) => {
            setIsConnected(false);
        };

        socket.onerror = (error) => {
            console.error(`[${speakerIdentifier}] Deepgram error:`, error);
        };

        socketRef.current = socket;

    }, [stream, token, speakerIdentifier, disconnect]);

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