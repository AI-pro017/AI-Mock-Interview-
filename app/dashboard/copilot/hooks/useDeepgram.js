"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export const useDeepgram = (stream, apiKey) => {
    const [transcript, setTranscript] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const processorRef = useRef(null);
    const audioContextRef = useRef(null);

    const connect = useCallback(() => {
        if (!apiKey) {
            console.error("Deepgram API key is required.");
            return;
        }
        
        const url = 'wss://api.deepgram.com/v1/listen?' + 
            'encoding=linear16&sample_rate=16000&channels=1' +
            '&diarize=true&punctuate=true&utterances=true' +
            '&model=nova-2&language=en';

        const socket = new WebSocket(url, {
            headers: { Authorization: `Token ${apiKey}` }
        });

        socket.onopen = () => {
            console.log("Deepgram connected");
            setIsConnected(true);
        };

        socket.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (data.type === 'Results' && data.is_final) {
                const transcriptText = data.channel.alternatives[0].transcript;
                const speaker = data.channel.alternatives[0].words[0]?.speaker || 0;
                if (transcriptText) {
                    setTranscript({
                        text: transcriptText,
                        speaker: `Speaker ${speaker}`,
                        timestamp: Date.now(),
                    });
                }
            }
        };
        
        socket.onclose = () => {
            console.log("Deepgram disconnected");
            setIsConnected(false);
        };
        
        socket.onerror = (error) => {
            console.error("Deepgram error:", error);
        };

        socketRef.current = socket;
    }, [apiKey]);
    
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    }, []);

    useEffect(() => {
        if (stream && isConnected) {
            audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16Data[i] = Math.min(1, inputData[i]) * 0x7FFF;
                }
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(int16Data.buffer);
                }
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);
            
            processorRef.current = processor;
        }

        return () => {
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
            }
        };
    }, [stream, isConnected]);

    return { transcript, connect, disconnect, isConnected };
}; 