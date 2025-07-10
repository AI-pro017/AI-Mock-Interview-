"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, BrainCircuit, User as UserIcon, Loader, Monitor, MonitorOff, AlertTriangle } from 'lucide-react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useDeepgram } from './hooks/useDeepgram';
import { useTranscriptManager } from './hooks/useTranscriptManager';
import { useAI } from './hooks/useAI';

const InterviewCopilotPage = () => {
    const [deepgramToken, setDeepgramToken] = useState('');
    const videoRef = useRef(null);
    const transcriptEndRef = useRef(null);
    const lastProcessedTranscriptRef = useRef(null);

    const {
        micStream,
        tabStream,
        error: captureError,
        isCapturing,
        startCapture,
        stopCapture,
    } = useAudioCapture();

    const { transcript: micTranscript } = useDeepgram(micStream, deepgramToken, 'user');
    const { transcript: tabTranscript } = useDeepgram(tabStream, deepgramToken, 'client');
    
    const { transcripts, processTranscript, clearTranscripts, getSpeakerLabel } = useTranscriptManager();
    const { suggestions, isLoading: isLoadingSuggestions, error: aiError, generateSuggestions, clearSuggestions } = useAI();

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const response = await fetch('/api/deepgram');
                const data = await response.json();
                if (data.deepgramToken) setDeepgramToken(data.deepgramToken);
                else console.error('Failed to fetch Deepgram token:', data.error);
            } catch (error) {
                console.error('Error fetching Deepgram token:', error);
            }
        };
        fetchToken();
    }, []);

    const toggleCapture = useCallback(async () => {
        if (isCapturing) {
            stopCapture();
            clearTranscripts();
            clearSuggestions();
            lastProcessedTranscriptRef.current = null;
        } else {
            clearTranscripts();
            clearSuggestions();
            lastProcessedTranscriptRef.current = null;
            await startCapture();
        }
    }, [isCapturing, stopCapture, clearTranscripts, clearSuggestions, startCapture]);

    useEffect(() => {
        if (tabStream && videoRef.current) {
            videoRef.current.srcObject = tabStream;
        } else if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [tabStream]);

    useEffect(() => {
        if (micTranscript) processTranscript(micTranscript);
    }, [micTranscript, processTranscript]);

    useEffect(() => {
        if (tabTranscript) processTranscript(tabTranscript);
    }, [tabTranscript, processTranscript]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [transcripts]);
    
    // Simplified logic: Only trigger when client speaks (not "You")
    useEffect(() => {
        // Find the most recent client message (not "You")
        const lastClientBlock = transcripts.findLast(block => block.speaker !== 'You');
        
        if (lastClientBlock) {
            // Create a unique key for this transcript state
            const transcriptKey = `${lastClientBlock.id}-${lastClientBlock.text}-${transcripts.length}`;
            
            // Only generate suggestions if this is a new state we haven't processed yet
            if (lastProcessedTranscriptRef.current !== transcriptKey) {
                lastProcessedTranscriptRef.current = transcriptKey;
                
                // Let OpenAI analyze the full conversation and determine what to respond to
                generateSuggestions(lastClientBlock.text, transcripts.slice(-10));
            }
        }
    }, [transcripts, generateSuggestions]);

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col p-4 lg:p-8">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center">
                    <Bot className="w-8 h-8 mr-3" />
                    Realtime Interview Copilot
                </h1>
                <Button onClick={toggleCapture} variant={isCapturing ? "destructive" : "default"} className="w-[160px]">
                    {isCapturing ? <MonitorOff className="w-5 h-5 mr-2" /> : <Monitor className="w-5 h-5 mr-2" />}
                    {isCapturing ? 'Stop Capture' : 'Start Capture'}
                </Button>
            </header>

            {captureError && <div className="text-red-400 bg-red-900/50 border border-red-800 p-4 rounded-lg mb-4 text-center">{captureError.message}</div>}

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg flex flex-col h-[900px]">
                    <div className="p-4 border-b border-gray-700 flex-shrink-0">
                        <h2 className="text-xl font-semibold text-blue-300">Live Transcription</h2>
                        <div className="text-xs text-gray-400 mt-1">
                            Transcripts count: {transcripts.length}
                        </div>
                    </div>
                    <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                        {transcripts.length === 0 && (
                            <div className="text-gray-400 text-center py-8">
                                No transcripts yet. Start speaking...
                            </div>
                        )}
                        {transcripts.map((block) => {
                            const isUser = block.speaker === 'You';
                            return (
                                <div key={block.id} className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
                                    {!isUser && <UserIcon className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />}
                                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-lg max-w-md ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                            <span className="font-semibold block text-sm">{block.speaker}</span>
                                            <p className="text-gray-200 whitespace-pre-wrap">{block.text}</p>
                                        </div>
                                    </div>
                                    {isUser && <UserIcon className="w-5 h-5 text-blue-300 mt-1 flex-shrink-0" />}
                                </div>
                            );
                        })}
                         <div ref={transcriptEndRef} />
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
                    <div className="flex-[1] bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
                        <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
                        {!isCapturing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 p-4">
                                <Monitor size={64} className="mb-4" />
                                <h3 className="text-xl font-semibold text-gray-300">Interview Copilot</h3>
                                <p>Click 'Start Capture' to select your meeting tab.</p>
                            </div>
                        )}
                    </div>
                    <div className="flex-[1] bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-xl font-semibold text-green-300">AI Suggestions</h2>
                        </div>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                            {isLoadingSuggestions && (
                                <div className="flex items-center text-gray-400">
                                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                                    Generating suggestions...
                                </div>
                            )}
                            
                            {aiError && (
                                <div className="bg-red-900/50 border border-red-800 p-3 rounded-lg">
                                    <div className="flex items-center text-red-300">
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        <span className="text-sm">{aiError}</span>
                                    </div>
                                </div>
                            )}
                            
                            {suggestions.length === 0 && !isLoadingSuggestions && !aiError && (
                                <div className="text-gray-400 text-center py-8">
                                    AI suggestions will appear here when the interviewer speaks.
                                </div>
                            )}
                            
                            {suggestions.map((s, i) => (
                                <div key={i} className="bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-bold text-lg flex items-center mb-2">
                                        <BrainCircuit className="w-5 h-5 mr-2 text-green-400" />
                                        {s.type}
                                    </h4>
                                    <p className="text-gray-300">{s.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewCopilotPage;