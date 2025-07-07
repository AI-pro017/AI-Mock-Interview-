"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, BrainCircuit, User as UserIcon, Loader, Monitor, MonitorOff, CheckCircle } from 'lucide-react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useDeepgram } from './hooks/useDeepgram';
import { useAI } from './hooks/useAI';

const InterviewCopilotPage = () => {
    const [isCapturing, setIsCapturing] = useState(false);
    const [transcripts, setTranscripts] = useState([]);
    const [audioStream, setAudioStream] = useState(null);
    const [userSpeakerId, setUserSpeakerId] = useState(null);
    const videoRef = useRef(null);
    const transcriptEndRef = useRef(null);
    
    const speakerLabelMap = useRef({});
    const nextInterviewerNumber = useRef(1);
    
    const { stream, error: captureError, startCapture, stopCapture } = useAudioCapture();
    const { transcript, connect, disconnect, isConnected } = useDeepgram(audioStream, process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY);
    const { suggestions, isLoading: isLoadingSuggestions, generateSuggestions } = useAI();

    const scrollToBottom = () => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const toggleCapture = async () => {
        if (isCapturing) {
            stopCapture();
        } else {
            // Reset state for a new session
            setTranscripts([]);
            setUserSpeakerId(null);
            speakerLabelMap.current = {};
            nextInterviewerNumber.current = 1;
            await startCapture();
        }
    };
    
    const handleSetUserSpeaker = (speakerId) => {
        setUserSpeakerId(speakerId);
    };
    
    const getSpeakerLabel = useCallback((speakerId) => {
        if (userSpeakerId === null) {
            return `Speaker ${speakerId}`;
        }
        if (speakerId === userSpeakerId) {
            return 'You';
        }
        if (speakerLabelMap.current[speakerId]) {
            return speakerLabelMap.current[speakerId];
        }
        const newLabel = `Interviewer ${nextInterviewerNumber.current++}`;
        speakerLabelMap.current[speakerId] = newLabel;
        return newLabel;
    }, [userSpeakerId]);

    // Effect to manage the stream state from the capture hook
    useEffect(() => {
        if (stream) {
            setIsCapturing(true);
            if (videoRef.current) videoRef.current.srcObject = stream;
            
            if (stream.getAudioTracks().length > 0) {
                const audioOnlyStream = new MediaStream(stream.getAudioTracks());
                setAudioStream(audioOnlyStream);
            }
            // Add a listener to stop our session if the user uses the browser's "Stop sharing" button
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) videoTrack.onended = stopCapture;
        } else {
            setIsCapturing(false);
            setAudioStream(null);
            if (videoRef.current) videoRef.current.srcObject = null;
            disconnect();
        }
    }, [stream, stopCapture, disconnect]);

    // Effect to connect to Deepgram once we have an audio stream
    useEffect(() => {
        if (isCapturing && audioStream && !isConnected) connect();
    }, [isCapturing, audioStream, isConnected, connect]);

    // Effect to process new transcripts
    useEffect(() => {
        if (transcript) {
            setTranscripts(prev => [...prev, transcript]);
            
            const isInterviewer = userSpeakerId !== null && transcript.speaker !== userSpeakerId;
            if (isInterviewer) { 
                const conversationHistory = [...transcripts, transcript].slice(-5);
                generateSuggestions(transcript.text, conversationHistory);
            }
        }
    }, [transcript, userSpeakerId, generateSuggestions]);

    // Effect to auto-scroll the transcript view
    useEffect(scrollToBottom, [transcripts]);

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

            {captureError && <div className="text-red-400 bg-red-900/50 border border-red-800 p-4 rounded-lg mb-4 text-center">{captureError}</div>}

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                <div className="lg:col-span-2 bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
                    <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
                    {!isCapturing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 p-4">
                            <Monitor size={64} className="mb-4" />
                            <h3 className="text-xl font-semibold text-gray-300">Interview Copilot</h3>
                            <p>Click 'Start Capture' to select your meeting tab.</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0">
                    <div className="p-4 border-b border-gray-700">
                        <h2 className="text-xl font-semibold text-blue-300">Live Transcription</h2>
                    </div>
                    <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                        {transcripts.map((t, i) => {
                            const speakerLabel = getSpeakerLabel(t.speaker);
                            const isUser = speakerLabel === 'You';
                            const showIdentificationButton = userSpeakerId === null;
                            return (
                                <div key={i} className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
                                    {!isUser && <UserIcon className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />}
                                    <div className={`flex flex-col items-start ${isUser ? 'items-end' : ''}`}>
                                        <div className={`p-3 rounded-lg max-w-xs ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                            <span className="font-semibold block text-sm">{speakerLabel}</span>
                                            <p className="text-gray-200">{t.text}</p>
                                        </div>
                                        {showIdentificationButton && (
                                            <Button onClick={() => handleSetUserSpeaker(t.speaker)} size="sm" variant="ghost" className="text-xs text-gray-400 hover:text-white mt-1 h-auto py-1 px-2">
                                                <CheckCircle className="w-3 h-3 mr-1" /> That's me
                                            </Button>
                                        )}
                                    </div>
                                    {isUser && <UserIcon className="w-5 h-5 text-blue-300 mt-1 flex-shrink-0" />}
                                </div>
                            );
                        })}
                         <div ref={transcriptEndRef} />
                    </div>

                     <div className="flex-[2] flex flex-col min-h-0 border-t border-gray-700">
                        <div className="p-4">
                            <h2 className="text-xl font-semibold text-green-300">AI Suggestions</h2>
                        </div>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                            {isLoadingSuggestions && <div className="flex items-center text-gray-400"><Loader className="w-5 h-5 mr-2 animate-spin" />Generating...</div>}
                            {suggestions.map((s, i) => (
                                <div key={i} className="bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-bold text-lg flex items-center mb-2"><BrainCircuit className="w-5 h-5 mr-2 text-green-400" />{s.type}</h4>
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