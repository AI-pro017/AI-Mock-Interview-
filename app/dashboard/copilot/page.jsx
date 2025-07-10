"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, BrainCircuit, User as UserIcon, Loader, Monitor, MonitorOff, AlertTriangle, Send, MessageSquare, X, Volume2, VolumeX, HelpCircle, Info } from 'lucide-react';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useDeepgram } from './hooks/useDeepgram';
import { useTranscriptManager } from './hooks/useTranscriptManager';
import { useAI } from './hooks/useAI';
import CodeHighlighter from './components/CodeHighlighter';

const InterviewCopilotPage = () => {
    const [deepgramToken, setDeepgramToken] = useState('');
    const [userInput, setUserInput] = useState('');
    const [userOverride, setUserOverride] = useState(null);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(45); // percentage
    const videoRef = useRef(null);
    const transcriptEndRef = useRef(null);
    const lastProcessedTranscriptRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const isResizing = useRef(false);

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
            console.log("Manual stop capture - clearing all data");
            manualStopRef.current = true; // Mark as manual stop
            stopCapture();
            clearTranscripts();
            clearSuggestions();
            lastProcessedTranscriptRef.current = null;
            setUserOverride(null);
            setUserInput('');
        } else {
            console.log("Manual start capture - clearing previous data");
            clearTranscripts();
            clearSuggestions();
            lastProcessedTranscriptRef.current = null;
            setUserOverride(null);
            setUserInput('');
            await startCapture();
        }
    }, [isCapturing, stopCapture, clearTranscripts, clearSuggestions, startCapture]);

    const handleUserInput = useCallback((e) => {
        e.preventDefault();
        if (userInput.trim()) {
            // User input takes precedence - create override
            setUserOverride({
                text: userInput.trim(),
                timestamp: Date.now()
            });
            
            // Generate suggestions based on user input
            generateSuggestions(userInput.trim(), transcripts.slice(-10));
            
            // Clear the input
            setUserInput('');
        }
    }, [userInput, transcripts, generateSuggestions]);

    useEffect(() => {
        if (tabStream && videoRef.current) {
            videoRef.current.srcObject = tabStream;
        } else if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [tabStream]);

    useEffect(() => {
        if (micTranscript && isCapturing) processTranscript(micTranscript);
    }, [micTranscript, processTranscript, isCapturing]);

    useEffect(() => {
        if (tabTranscript && isCapturing) processTranscript(tabTranscript);
    }, [tabTranscript, processTranscript, isCapturing]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [transcripts]);
    
    // Clean up when capture stops due to system stopping screen sharing
    const prevIsCapturingRef = useRef(isCapturing);
    const manualStopRef = useRef(false);
    
    useEffect(() => {
        // Only clear when transitioning from capturing to not capturing AND it wasn't a manual stop
        if (prevIsCapturingRef.current && !isCapturing && !manualStopRef.current) {
            console.log("System stopped sharing - cleaning up UI state");
            clearTranscripts();
            clearSuggestions();
            lastProcessedTranscriptRef.current = null;
            setUserOverride(null);
            setUserInput('');
        }
        prevIsCapturingRef.current = isCapturing;
        // Reset manual stop flag after processing
        manualStopRef.current = false;
    }, [isCapturing, clearTranscripts, clearSuggestions]);
    
    // Enhanced logic: Respect user overrides, otherwise trigger when client speaks
    useEffect(() => {
        // If user has provided an override, don't auto-generate from transcripts
        if (userOverride) {
            return;
        }
        
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
    }, [transcripts, generateSuggestions, userOverride]);

    // Resize functionality
    const handleMouseDown = useCallback((e) => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current || !containerRef.current) return;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        // Constrain between 20% and 80%
        if (newLeftWidth >= 20 && newLeftWidth <= 80) {
            setLeftPanelWidth(newLeftWidth);
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
    }, [handleMouseMove]);

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col p-4 lg:p-8">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center">
                    <Bot className="w-8 h-8 mr-3" />
                    Realtime Interview Copilot
                </h1>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setShowHelpModal(true)} 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <HelpCircle className="w-4 h-4" />
                        Help
                    </Button>
                    <Button onClick={toggleCapture} variant={isCapturing ? "destructive" : "default"} className="w-[160px]">
                        {isCapturing ? <MonitorOff className="w-5 h-5 mr-2" /> : <Monitor className="w-5 h-5 mr-2" />}
                        {isCapturing ? 'Stop Capture' : 'Start Capture'}
                    </Button>
                </div>
            </header>

            {/* Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">How to Use Interview Copilot</h2>
                            <button 
                                onClick={() => setShowHelpModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-4 text-gray-300">
                            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                                                                    <h3 className="text-green-300 font-semibold mb-2">✅ How to Use (Required Steps)</h3>
                                    <ol className="list-decimal list-inside space-y-1 text-sm">
                                        <li>Open your meeting in a browser tab</li>
                                        <li>Click "Start Capture" button</li>
                                        <li>Select the <strong>meeting tab</strong> or <strong>entire screen</strong> (not window)</li>
                                        <li>Make sure to check "Share tab audio" (for tabs) or "Share system audio" (for screen) when prompted</li>
                                        <li>The copilot will transcribe and provide AI suggestions</li>
                                    </ol>
                                    <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                                        <h4 className="text-yellow-300 font-semibold text-sm mb-1">⚠️ Important Audio Limitation</h4>
                                        <p className="text-yellow-200 text-xs">
                                            <strong>Screen sharing</strong> only captures system audio (what others say), not your microphone input. 
                                            For best results, use <strong>tab sharing</strong> which captures all meeting audio including your voice.
                                        </p>
                                    </div>
                            </div>

                            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                                <h3 className="text-red-300 font-semibold mb-2">❌ Not Supported</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>Window sharing (will be blocked)</li>
                                    <li>Tabs without audio</li>
                                    <li>Browsers other than Chrome for meetings</li>
                                </ul>
                            </div>

                            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                                <h3 className="text-blue-300 font-semibold mb-2">💡 Troubleshooting</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li>If you get "Window sharing not supported" - select a tab or entire screen instead</li>
                                    <li>If you see "No audio detected" - make sure to check the audio sharing option</li>
                                    <li>Check "Share tab audio" (for tabs) or "Share system audio" (for screen) when prompted</li>
                                    <li><strong>Missing your voice?</strong> Screen sharing only captures system audio, not your microphone. Use tab sharing instead.</li>
                                    <li>Make sure your meeting has participants speaking</li>
                                    <li>Check browser permissions for microphone and screen sharing</li>
                                    <li>Use the manual input field if audio transcription fails</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <Button onClick={() => setShowHelpModal(false)}>
                                Got it!
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {captureError && (
                <div className={`p-4 rounded-lg mb-4 text-center ${
                    captureError.type === 'warning' 
                        ? 'text-yellow-300 bg-yellow-900/50 border border-yellow-700' 
                        : 'text-red-400 bg-red-900/50 border border-red-800'
                }`}>
                    <div className="flex items-center justify-center gap-2">
                        {captureError.type === 'warning' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <span>{captureError.message}</span>
                    </div>
                    <div className="mt-3 flex justify-center gap-2">
                        <Button 
                            onClick={async () => {
                                stopCapture();
                                setTimeout(() => startCapture(), 500);
                            }}
                            size="sm"
                            variant="outline"
                            className="text-blue-300 border-blue-600 hover:bg-blue-900/50"
                        >
                            Try Again
                        </Button>
                        <Button 
                            onClick={() => setShowHelpModal(true)}
                            size="sm"
                            variant="outline"
                            className="text-blue-300 border-blue-600 hover:bg-blue-900/50"
                        >
                            Show Help
                        </Button>
                    </div>
                </div>
            )}

            <div ref={containerRef} className="flex-grow flex gap-6 min-h-0">
                <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-[calc(100vh-80px)]" style={{width: `${leftPanelWidth}%`}}>
                    <div className="p-4 border-b border-gray-700 flex-shrink-0">
                        <h2 className="text-xl font-semibold text-blue-300">Live Transcription</h2>
                        <div className="text-xs text-gray-400 mt-1">
                            Transcripts count: {transcripts.length}
                            {userOverride && (
                                <span className="ml-2 text-green-400">• User override active</span>
                            )}
                            {isCapturing && tabStream && tabStream.getAudioTracks().length === 0 && (
                                <span className="ml-2 text-yellow-400">• No audio - transcription disabled</span>
                            )}
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
                        
                        {userOverride && (
                            <div className="flex items-start gap-3 justify-end">
                                <div className="flex flex-col items-end">
                                    <div className="p-3 rounded-lg max-w-md bg-green-600 relative">
                                        <button
                                            onClick={() => setUserOverride(null)}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                        <span className="font-semibold block text-sm">User Override</span>
                                        <p className="text-gray-200 whitespace-pre-wrap">{userOverride.text}</p>
                                    </div>
                                </div>
                                <MessageSquare className="w-5 h-5 text-green-300 mt-1 flex-shrink-0" />
                            </div>
                        )}
                        
                         <div ref={transcriptEndRef} />
                    </div>
                    
                    <div className="p-4 border-t border-gray-700 flex-shrink-0">
                        <form onSubmit={handleUserInput} className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={isCapturing ? "Clarify or correct the question..." : "Start capture first to use manual input"}
                                disabled={!isCapturing}
                                className={`flex-1 px-3 py-2 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    isCapturing 
                                        ? 'bg-gray-700 border-gray-600' 
                                        : 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-50'
                                }`}
                            />
                            <Button 
                                type="submit" 
                                size="sm" 
                                disabled={!userInput.trim() || !isCapturing}
                                className="px-3 py-2"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                        <div className="text-xs text-gray-500 mt-2">
                            {isCapturing 
                                ? "Use this to clarify questions or provide corrections when audio processing fails"
                                : "Manual input is available once you start capturing"
                            }
                        </div>
                    </div>
                </div>

                {/* Resizable divider */}
                <div 
                    className="w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors relative group" 
                    onMouseDown={handleMouseDown}
                    title="Drag to resize panels"
                >
                    <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-500/20 transition-colors"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-8 bg-blue-400 rounded-full"></div>
                    </div>
                </div>

                <div className="flex flex-col gap-6 min-h-0 h-[calc(100vh-80px)]" style={{width: `${100 - leftPanelWidth - 1}%`}}>
                    <div className="h-[40%] bg-black rounded-lg overflow-hidden flex items-center justify-center relative min-h-0">
                        <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
                        {!isCapturing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 p-4">
                                <Monitor size={64} className="mb-4" />
                                <h3 className="text-xl font-semibold text-gray-300 mb-2">Interview Copilot</h3>
                                <p className="text-sm mb-4">Click 'Start Capture' to select your meeting tab.</p>
                                <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 max-w-md">
                                    <h4 className="text-blue-300 font-semibold mb-2">📋 Selection Requirements:</h4>
                                    <ul className="text-xs text-blue-200 space-y-1 text-left">
                                        <li>✅ <strong>Best:</strong> meeting tab (captures all audio including your voice)</li>
                                        <li>✅ <strong>Limited:</strong> entire screen (only captures system audio, not your mic)</li>
                                        <li>✅ Check "Share tab audio" (for tabs) or "Share system audio" (for screen)</li>
                                        <li>❌ <strong>Not supported:</strong> Window sharing</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-[calc(60%-24px)] bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0">
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-green-300">AI Suggestions</h2>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Context-aware responses • Dynamic length based on complexity
                                    </div>
                                </div>
                                {isLoadingSuggestions && (
                                    <div className="flex items-center text-gray-400">
                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                        <span className="text-sm">Generating suggestions...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                            
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
                                    <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                    <h3 className="text-lg font-medium text-gray-300 mb-2">Intelligent Suggestions Ready</h3>
                                    <p className="text-sm">
                                        AI will provide context-aware, detailed responses when the interviewer speaks.
                                        <br />
                                        Use the chat input below to override or clarify questions.
                                    </p>
                                </div>
                            )}
                            
                            {suggestions.map((s, i) => (
                                <div key={i} className="bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-bold text-lg flex items-center mb-3">
                                        <BrainCircuit className="w-5 h-5 mr-2 text-green-400" />
                                        {s.type}
                                    </h4>
                                    <div className="max-h-96 overflow-y-auto">
                                        <CodeHighlighter content={s.content} />
                                    </div>
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