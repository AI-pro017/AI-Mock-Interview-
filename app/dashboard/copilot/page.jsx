"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, BrainCircuit, User as UserIcon, Loader, Monitor, MonitorOff, AlertTriangle, Send, MessageSquare, X, Volume2, VolumeX, HelpCircle, Info, Clock, Zap } from 'lucide-react';
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
    const mobileVideoRef = useRef(null); // Separate ref for mobile
    const transcriptEndRef = useRef(null);
    const aiSuggestionsEndRef = useRef(null); // New ref for AI suggestions auto-scroll
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
    const { 
        suggestions, 
        isLoading: isLoadingSuggestions, 
        isStage2Loading,
        error: aiError, 
        generateSuggestions, 
        clearSuggestions,
        clearSessionContext,
        sessionContext
    } = useAI();

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
            clearSessionContext(); // Clear session context
            lastProcessedTranscriptRef.current = null;
            setUserOverride(null);
            setUserInput('');
        } else {
            console.log("Manual start capture - clearing previous data");
            clearTranscripts();
            clearSuggestions();
            clearSessionContext(); // Clear session context
            lastProcessedTranscriptRef.current = null;
            setUserOverride(null);
            setUserInput('');
            await startCapture();
        }
    }, [isCapturing, stopCapture, clearTranscripts, clearSuggestions, clearSessionContext, startCapture]);

    const handleUserInput = useCallback((e) => {
        e.preventDefault();
        if (userInput.trim()) {
            // User input takes precedence - create override
            setUserOverride({
                text: userInput.trim(),
                timestamp: Date.now()
            });
            
            // Generate suggestions based on user input (this is allowed - user override)
            generateSuggestions(userInput.trim(), transcripts.slice(-10));
            
            // Clear the input
            setUserInput('');
        }
    }, [userInput, transcripts, generateSuggestions]);

    useEffect(() => {
        if (tabStream) {
            if (videoRef.current) {
            videoRef.current.srcObject = tabStream;
            }
            if (mobileVideoRef.current) {
                mobileVideoRef.current.srcObject = tabStream;
            }
        } else {
            if (videoRef.current) {
            videoRef.current.srcObject = null;
            }
            if (mobileVideoRef.current) {
                mobileVideoRef.current.srcObject = null;
            }
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
            clearSessionContext();
            lastProcessedTranscriptRef.current = null;
            setUserOverride(null);
            setUserInput('');
        }
        prevIsCapturingRef.current = isCapturing;
        // Reset manual stop flag after processing
        manualStopRef.current = false;
    }, [isCapturing, clearTranscripts, clearSuggestions, clearSessionContext]);
    
    // Helper function to determine if a speaker is a client (interviewer)
    const isClientSpeaker = useCallback((speaker) => {
        // Client speakers are anyone who is NOT "You"
        return speaker !== 'You';
    }, []);

    // Helper function to determine if a transcript block represents a question
    const isQuestionBlock = useCallback((block) => {
        if (!block || !block.text) return false;
        
        const text = block.text.trim().toLowerCase();
        const wordCount = text.split(' ').length;
        
        // If text is too short (less than 3 words), check if it's a valid question word
        if (wordCount < 3) {
            const shortQuestionWords = [
                'what', 'how', 'why', 'when', 'where', 'who', 'which', 
                'can you', 'could you', 'would you', 'tell me', 'explain', 'describe'
            ];
            
            // Check if the short text contains any question words
            return shortQuestionWords.some(questionWord => text.includes(questionWord));
        }
        
        // For longer content (3+ words), always return true - let AI determine if it's worth responding to
        return true;
    }, []);

    // Enhanced logic: ONLY generate suggestions for client questions and user overrides
    useEffect(() => {
        // If user has provided an override, don't auto-generate from transcripts
        if (userOverride) {
            console.log("User override active - skipping auto-generation");
            return;
        }
        
        // Find the most recent transcript block
        const lastBlock = transcripts[transcripts.length - 1];
        
        if (!lastBlock) {
            console.log("No transcripts available");
            return;
        }
        
        // CRITICAL: Only generate suggestions for CLIENT speakers (not user responses)
        if (!isClientSpeaker(lastBlock.speaker)) {
            console.log(`Skipping AI generation - speaker is "${lastBlock.speaker}" (user response)`);
            return;
        }
        
        // Basic content check: Only generate for meaningful content or question words
        if (!isQuestionBlock(lastBlock)) {
            console.log(`Skipping AI generation - not meaningful content or question: "${lastBlock.text.substring(0, 50)}..."`);
            return;
        }
        
        // Create a unique key for this transcript state
        const transcriptKey = `${lastBlock.id}-${lastBlock.text}-${transcripts.length}`;
        
        // Only generate suggestions if this is a new state we haven't processed yet
        if (lastProcessedTranscriptRef.current !== transcriptKey) {
            console.log(`Generating AI suggestions for client question: "${lastBlock.text.substring(0, 50)}..."`);
            lastProcessedTranscriptRef.current = transcriptKey;
            
            // Generate context-aware suggestions with session history
            generateSuggestions(lastBlock.text, transcripts.slice(-10));
        } else {
            console.log("Skipping AI generation - already processed this transcript");
        }
    }, [transcripts, generateSuggestions, userOverride, isClientSpeaker, isQuestionBlock]);

    // Add auto-scroll effect for AI suggestions
    useEffect(() => {
        aiSuggestionsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [suggestions]);

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
        <div className="bg-gray-900 text-white min-h-screen flex flex-col p-1 sm:p-2 lg:p-4 overflow-hidden">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 flex-shrink-0 gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Realtime Interview Copilot</span>
                    <span className="sm:hidden">Interview Copilot</span>
                    <span className="ml-2 sm:ml-3 text-xs bg-blue-600 px-2 py-1 rounded-full">
                        Enhanced Context AI
                    </span>
                </h1>
                <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                    {/* Session Context Indicator */}
                    {sessionContext.length > 0 && (
                        <div className="flex items-center gap-1 sm:gap-2 bg-green-900/30 border border-green-700 rounded-lg px-2 sm:px-3 py-1">
                            <BrainCircuit className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                            <span className="text-xs sm:text-sm text-green-300">
                                {sessionContext.length} context{sessionContext.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                    
                    <Button 
                        onClick={() => setShowHelpModal(true)} 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                    >
                        <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Help</span>
                    </Button>
                    <Button onClick={toggleCapture} variant={isCapturing ? "destructive" : "default"} className="text-xs sm:text-sm px-2 sm:px-4">
                        {isCapturing ? <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> : <Monitor className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
                        {isCapturing ? 'Stop' : 'Start'}
                        <span className="hidden sm:inline ml-1"> Capture</span>
                    </Button>
                </div>
            </header>

            {/* Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-3xl max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Smart Interview Copilot Guide</h2>
                            <Button onClick={() => setShowHelpModal(false)} variant="ghost" size="sm">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <div className="space-y-4 text-gray-300">
                            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 rounded-lg p-4">
                                <h3 className="text-blue-300 font-semibold mb-2 flex items-center">
                                    <BrainCircuit className="w-5 h-5 mr-2" />
                                    🤖 Smart AI Triggering - Key Innovation
                                </h3>
                                <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                                    <p className="text-sm text-gray-200 mb-2">
                                        <strong>Revolutionary Feature:</strong> AI automatically detects when the interviewer asks questions and stays silent when you respond.
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                        <li><strong>Interviewer Questions:</strong> AI instantly provides two-stage suggestions</li>
                                        <li><strong>Your Responses:</strong> AI stays completely silent (no interference)</li>
                                        <li><strong>Context Memory:</strong> AI remembers all previous questions for better follow-ups</li>
                                        <li><strong>Manual Override:</strong> Force AI suggestions anytime using input field</li>
                                </ul>
                                </div>
                            </div>

                            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                                <h3 className="text-green-300 font-semibold mb-2">✅ Quick Setup Guide</h3>
                                <ol className="list-decimal list-inside space-y-2 text-sm">
                                    <li><strong>Open your interview meeting</strong> in a browser tab (Zoom, Meet, Teams, etc.)</li>
                                    <li><strong>Click "Start Capture"</strong> button above</li>
                                    <li><strong>Select your meeting tab</strong> or entire screen when prompted</li>
                                    <li><strong>✅ CRITICAL:</strong> Check "Share tab audio" (for tabs) or "Share system audio" (for screen)</li>
                                    <li><strong>Start your interview</strong> - AI will automatically detect and respond to interviewer questions only</li>
                                </ol>
                            </div>

                            <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
                                <h3 className="text-orange-300 font-semibold mb-2">🎯 Smart AI Triggering Rules</h3>
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div className="bg-green-800/30 border border-green-600 rounded-lg p-3">
                                        <h4 className="text-green-300 font-semibold mb-2 flex items-center">
                                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                            AI WILL Respond To:
                                        </h4>
                                                                    <ul className="text-xs space-y-1 text-green-200">
                                <li>• <strong>Interviewer speech</strong> (Client 1, Client 2, etc.)</li>
                                <li>• <strong>Question words</strong> (what, how, why, when, where, who, which)</li>
                                <li>• <strong>Meaningful content</strong> from interviewers (3+ words)</li>
                                <li>• <strong>Manual overrides</strong> (input field below)</li>
                            </ul>
                                    </div>
                                    
                                    <div className="bg-red-800/30 border border-red-600 rounded-lg p-3">
                                        <h4 className="text-red-300 font-semibold mb-2 flex items-center">
                                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                            AI Will NOT Respond To:
                                        </h4>
                                                                    <ul className="text-xs space-y-1 text-red-200">
                                <li>• <strong>Your responses</strong> (labeled as "You")</li>
                                <li>• <strong>Short non-question content</strong> (less than 3 words without question words)</li>
                                <li>• <strong>Background noise</strong> or unclear audio</li>
                                <li>• <strong>Empty transcriptions</strong> or system errors</li>
                            </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                                <h3 className="text-purple-300 font-semibold mb-2">⚡ Two-Stage AI Response System</h3>
                                <div className="space-y-3">
                                    <div className="bg-yellow-800/30 border border-yellow-600 rounded-lg p-3">
                                        <h4 className="text-yellow-300 font-semibold mb-1 flex items-center">
                                            <Clock className="w-4 h-4 mr-2" />
                                            Stage 1: Instant Response (1-2 seconds)
                                        </h4>
                                        <ul className="text-xs space-y-1 text-yellow-200">
                                            <li>• <strong>Brief, confident answer</strong> (1-2 sentences max)</li>
                                            <li>• <strong>Key points to mention</strong> (5-8 words)</li>
                                            <li>• <strong>Ready to speak immediately</strong></li>
                                            <li>• <strong>Appears instantly</strong> when interviewer asks question</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-blue-800/30 border border-blue-600 rounded-lg p-3">
                                        <h4 className="text-blue-300 font-semibold mb-1 flex items-center">
                                            <Zap className="w-4 h-4 mr-2" />
                                            Stage 2: Detailed Enhancement (3-8 seconds later)
                                        </h4>
                                        <ul className="text-xs space-y-1 text-blue-200">
                                            <li>• <strong>Comprehensive response</strong> with examples and details</li>
                                            <li>• <strong>Code examples</strong> for technical questions</li>
                                            <li>• <strong>STAR method</strong> for behavioral questions</li>
                                            <li>• <strong>Context integration</strong> from previous questions</li>
                                            <li>• <strong>Deep technical insights</strong> and best practices</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-4">
                                <h3 className="text-cyan-300 font-semibold mb-2">🧠 Context Memory System</h3>
                                <div className="bg-gray-800/50 rounded-lg p-3">
                                    <ul className="text-sm space-y-2 text-gray-200">
                                        <li><strong>Session Memory:</strong> AI remembers up to 10 previous questions</li>
                                        <li><strong>Follow-up Detection:</strong> Recognizes when questions build on previous topics</li>
                                        <li><strong>Smart References:</strong> "Earlier, you mentioned X. You could expand by adding Y."</li>
                                        <li><strong>Avoids Repetition:</strong> Won't repeat information already covered</li>
                                        <li><strong>Context Counter:</strong> Shows active contexts in header (green badge)</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                                <h3 className="text-blue-300 font-semibold mb-2">🎧 Audio Performance Guide</h3>
                                <div className="space-y-3">
                                    <div className="bg-green-800/30 border border-green-600 rounded-lg p-3">
                                        <h4 className="text-green-300 font-semibold mb-1">🚀 Tab Sharing (Recommended)</h4>
                                        <ul className="text-xs space-y-1 text-green-200">
                                            <li>• <strong>Ultra-fast transcription</strong> - Real-time processing</li>
                                            <li>• <strong>Perfect audio quality</strong> - Direct from meeting app</li>
                                            <li>• <strong>Instant AI responses</strong> - No audio delays</li>
                                            <li>• <strong>Best for interviews</strong> - Choose this option</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-yellow-800/30 border border-yellow-600 rounded-lg p-3">
                                        <h4 className="text-yellow-300 font-semibold mb-1">🐌 Screen Sharing (Backup)</h4>
                                        <ul className="text-xs space-y-1 text-yellow-200">
                                            <li>• <strong>Slower transcription</strong> - System audio has delays</li>
                                            <li>• <strong>1-2 second lag</strong> - AI responses delayed</li>
                                            <li>• <strong>Use only if needed</strong> - For screen demonstrations</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4">
                                <h3 className="text-indigo-300 font-semibold mb-2">🔧 Manual Override System</h3>
                                <div className="bg-gray-800/50 rounded-lg p-3">
                                    <p className="text-sm text-gray-200 mb-2">
                                        <strong>Purpose:</strong> Force AI suggestions when auto-detection fails or for practice.
                                    </p>
                                    <ul className="text-sm space-y-1 text-gray-300">
                                        <li><strong>How to use:</strong> Type question in input field below transcripts</li>
                                        <li><strong>When to use:</strong> Audio quality issues, practice sessions, clarifications</li>
                                        <li><strong>Override indicator:</strong> Shows as green "User Override" bubble</li>
                                        <li><strong>Removal:</strong> Click X on override bubble to return to auto-mode</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                                <h3 className="text-red-300 font-semibold mb-2">❌ Limitations & Not Supported</h3>
                                <ul className="text-sm space-y-1">
                                    <li>• <strong>Window sharing</strong> - Browser security blocks this</li>
                                    <li>• <strong>Tabs without audio</strong> - No transcription possible</li>
                                    <li>• <strong>Non-Chrome browsers</strong> - For meeting compatibility</li>
                                    <li>• <strong>Background apps</strong> - Must share meeting tab/screen</li>
                                    <li>• <strong>Offline meetings</strong> - Requires internet connection</li>
                                </ul>
                            </div>

                            <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                                <h3 className="text-gray-300 font-semibold mb-2">🔍 Troubleshooting Guide</h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-800/50 rounded-lg p-3">
                                        <h4 className="text-gray-200 font-semibold mb-1">Common Issues & Solutions:</h4>
                                        <ul className="text-sm space-y-1 text-gray-300">
                                            <li><strong>AI responds to my answers:</strong> Check speaker detection in transcripts</li>
                                            <li><strong>AI doesn't respond to questions:</strong> Verify audio sharing is enabled</li>
                                            <li><strong>Slow transcription:</strong> Switch from screen to tab sharing</li>
                                            <li><strong>No audio detected:</strong> Check "Share tab audio" or "Share system audio"</li>
                                            <li><strong>Context not working:</strong> Look for green context counter in header</li>
                                            <li><strong>Stage 2 not appearing:</strong> Wait 3-8 seconds after Stage 1</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-blue-800/30 border border-blue-600 rounded-lg p-3">
                                        <h4 className="text-blue-300 font-semibold mb-1">Performance Tips:</h4>
                                        <ul className="text-sm space-y-1 text-blue-200">
                                            <li>• <strong>Close unnecessary tabs</strong> - Reduces system load</li>
                                            <li>• <strong>Use wired internet</strong> - More stable than WiFi</li>
                                            <li>• <strong>Keep meeting tab active</strong> - Better audio processing</li>
                                            <li>• <strong>Clear browser cache</strong> - If experiencing issues</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                                <h3 className="text-green-300 font-semibold mb-2">🎯 Best Practices for Success</h3>
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div>
                                        <h4 className="text-green-200 font-semibold mb-1">Before Interview:</h4>
                                        <ul className="text-xs space-y-1 text-green-100">
                                            <li>• Test audio sharing with a practice call</li>
                                            <li>• Verify transcription accuracy</li>
                                            <li>• Check context memory is working</li>
                                            <li>• Practice with manual override</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-green-200 font-semibold mb-1">During Interview:</h4>
                                        <ul className="text-xs space-y-1 text-green-100">
                                            <li>• Let AI detect questions automatically</li>
                                            <li>• Use Stage 1 for quick responses</li>
                                            <li>• Wait for Stage 2 for detailed answers</li>
                                            <li>• Use manual override if needed</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {captureError && (
                <div className={`p-3 sm:p-4 rounded-lg mb-4 text-center ${
                    captureError.type === 'warning' 
                        ? 'text-yellow-300 bg-yellow-900/50 border border-yellow-700' 
                        : 'text-red-400 bg-red-900/50 border border-red-800'
                }`}>
                    <div className="flex items-center justify-center gap-2">
                        {captureError.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                        )}
                        <span className="text-sm sm:text-base">{captureError.message}</span>
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

            {/* Mobile Layout (Stack vertically) */}
            <div className="flex-grow flex flex-col lg:hidden gap-3 min-h-0">
                {/* Mobile: AI Suggestion Box (Top Priority) */}
                <div className="h-[45%] bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0">
                    <div className="p-3 border-b border-gray-700 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-green-300">AI Suggestion BOX</h2>
                        <div className="text-xs text-gray-400 mt-1">
                                    <span className="hidden sm:inline">Interviewer questions only • Context memory • Two-stage responses • Manual override</span>
                                    <span className="sm:hidden">Smart AI Ready</span>
                                    {isStage2Loading && (
                                        <div className="flex items-center text-blue-400 mt-1">
                                            <Zap className="w-3 h-3 mr-1" />
                                            <span>Stage 2 enhancing...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isLoadingSuggestions && (
                                <div className="flex items-center text-gray-400">
                                    <Loader className="w-4 h-4 mr-1 animate-spin" />
                                    <span className="text-xs">Loading...</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-grow p-3 space-y-3 overflow-y-auto">
                        {aiError && (
                            <div className="bg-red-900/50 border border-red-800 p-3 rounded-lg">
                                <div className="flex items-center text-red-300">
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    <span className="text-sm">{aiError}</span>
                                </div>
                            </div>
                        )}
                        
                        {suggestions.length === 0 && !isLoadingSuggestions && !aiError && (
                            <div className="text-gray-400 text-center py-6">
                                <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                <h3 className="text-lg font-medium text-gray-300 mb-2">Smart AI Ready</h3>
                                <p className="text-sm leading-relaxed">
                                    AI will automatically respond to any meaningful interviewer speech.<br />
                                    Your responses won't trigger AI - only client speech will.
                                </p>
                                        </div>
                        )}
                        
                        {suggestions.map((s, i) => (
                            <div key={i} className="bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-bold text-base flex items-center mb-3">
                                    <BrainCircuit className="w-5 h-5 mr-2 text-green-400" />
                                    {s.type}
                                </h4>
                                <div className="max-h-64 overflow-y-auto text-sm leading-relaxed">
                                    <CodeHighlighter content={s.content} />
                                </div>
                            </div>
                        ))}
                        
                        <div ref={aiSuggestionsEndRef} />
                    </div>
                </div>

                {/* Mobile: Video Component */}
                <div className="h-[30%] bg-black rounded-lg overflow-hidden flex items-center justify-center relative min-h-0">
                    <video 
                        ref={mobileVideoRef} 
                        autoPlay 
                        muted 
                        playsInline={true}
                        className="w-full h-full object-contain" 
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                    {!isCapturing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 p-3">
                            <Monitor size={32} className="mb-2" />
                            <h3 className="text-sm font-semibold text-gray-300 mb-1">Interview Copilot</h3>
                            <p className="text-xs mb-2">Click 'Start Capture' to begin.</p>
                        </div>
                    )}
                    {/* Debug info for mobile */}
                    {isCapturing && !tabStream && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                            No stream
                        </div>
                    )}
                    {isCapturing && tabStream && (
                        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            Stream active
                        </div>
                    )}
                </div>

                {/* Mobile: Input and Transcription Combined */}
                <div className="h-[25%] bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0">
                    {/* Input Section */}
                    <div className="p-2 border-b border-gray-700">
                        {userOverride && (
                            <div className="mb-2 p-2 rounded-lg bg-green-600 relative">
                                        <button
                                            onClick={() => setUserOverride(null)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                        >
                                    <X className="w-2 h-2 text-white" />
                                        </button>
                                <span className="font-semibold block text-xs">User Override</span>
                                <p className="text-gray-200 text-xs">{userOverride.text}</p>
                            </div>
                        )}
                        
                        <form onSubmit={handleUserInput} className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={isCapturing ? "Type question..." : "Start capture first"}
                                disabled={!isCapturing}
                                className={`flex-1 px-2 py-1 border rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm ${
                                    isCapturing 
                                        ? 'bg-gray-700 border-gray-600' 
                                        : 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-50'
                                }`}
                            />
                            <Button 
                                type="submit" 
                                size="sm" 
                                disabled={!userInput.trim() || !isCapturing}
                                className="px-2 py-1"
                            >
                                <Send className="w-3 h-3" />
                            </Button>
                        </form>
                    </div>

                    {/* Transcription Section */}
                    <div className="flex-grow p-2 overflow-y-auto">
                        <div className="text-xs text-gray-400 mb-2">
                            Live Transcription • {transcripts.length} transcripts
                        </div>
                        <div className="space-y-2">
                            {transcripts.length === 0 && (
                                <div className="text-gray-400 text-center py-4 text-xs">
                                    No transcripts yet. Start speaking...
                                </div>
                            )}
                            {transcripts.slice(-3).map((block) => {
                                const isUser = block.speaker === 'You';
                                return (
                                    <div key={block.id} className={`flex items-start gap-1 ${isUser ? 'justify-end' : ''}`}>
                                        {!isUser && <UserIcon className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />}
                                        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-2 rounded max-w-xs ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                                <span className="font-semibold block text-xs">{block.speaker}</span>
                                                <p className="text-gray-200 text-xs">{block.text}</p>
                                            </div>
                                        </div>
                                        {isUser && <UserIcon className="w-3 h-3 text-blue-300 mt-1 flex-shrink-0" />}
                                    </div>
                                );
                            })}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Layout (Side by side) */}
            <div ref={containerRef} className="hidden lg:flex flex-grow gap-4 min-h-0 w-full overflow-hidden">
                {/* Left Column - 3 panels stacked */}
                <div className="flex flex-col gap-4 min-h-0 h-[calc(100vh-80px)] overflow-hidden" style={{width: `${leftPanelWidth}%`}}>
                    {/* Top Left: Interview Copilot Component (Video) */}
                    <div className="h-[45%] bg-black rounded-lg overflow-hidden flex items-center justify-center relative min-h-0">
                        <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
                        {!isCapturing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 p-1 xl:p-2 2xl:p-4 overflow-y-auto">
                                <Monitor size={24} className="mb-1 xl:mb-2 2xl:mb-3 flex-shrink-0" />
                                <h3 className="text-xs xl:text-sm 2xl:text-lg font-semibold text-gray-300 mb-1 xl:mb-2 flex-shrink-0">Interview Copilot</h3>
                                <p className="text-xs xl:text-sm mb-1 xl:mb-2 2xl:mb-3 flex-shrink-0 px-1 leading-tight">Click 'Start Capture' to begin detection.</p>
                                
                                {/* Highly Responsive Smart AI Features Card */}
                                <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-1 xl:p-2 2xl:p-3 w-full max-w-[200px] xl:max-w-[280px] 2xl:max-w-sm overflow-hidden mx-auto">
                                    <h4 className="text-blue-300 font-semibold mb-1 xl:mb-2 text-xs 2xl:text-sm">🤖 Smart AI Features:</h4>
                                    
                                    {/* Compact version for very small screens */}
                                    <div className="xl:hidden">
                                        <div className="text-xs text-blue-200 space-y-0.5 leading-tight">
                                            <div className="break-words">🎯 Smart Detection</div>
                                            <div className="break-words">🚫 Silent on Your Responses</div>
                                            <div className="break-words">⚡ Two-Stage Responses</div>
                                            <div className="break-words">🧠 Context Memory</div>
                                            <div className="break-words">🔧 Manual Override</div>
                                        </div>
                                    </div>
                                    
                                    {/* Full version for larger screens */}
                                    <ul className="hidden xl:block text-xs text-blue-200 space-y-0.5 xl:space-y-1 text-left leading-tight">
                                        <li className="break-words">🎯 <strong>Smart Detection:</strong> <span className="hidden 2xl:inline">AI responds to question words and meaningful client speech</span><span className="2xl:hidden">AI responds to questions</span></li>
                                        <li className="break-words">🚫 <strong>Silent on Your Responses:</strong> <span className="hidden 2xl:inline">No interference when you speak</span><span className="2xl:hidden">No interference</span></li>
                                        <li className="break-words">⚡ <strong>Two-Stage Responses:</strong> <span className="hidden 2xl:inline">Instant (0.2s) + Detailed (3-8s)</span><span className="2xl:hidden">Instant + Detailed</span></li>
                                        <li className="break-words">🧠 <strong>Context Memory:</strong> <span className="hidden 2xl:inline">Remembers previous questions for better follow-ups</span><span className="2xl:hidden">Remembers context</span></li>
                                        <li className="break-words">🔧 <strong>Manual Override:</strong> <span className="hidden 2xl:inline">Force AI suggestions anytime</span><span className="2xl:hidden">Force suggestions</span></li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Middle Left: Chatbox (User Input) - Highly Responsive */}
                    <div className="h-[15%] bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0 overflow-hidden">
                        <div className="p-1 xl:p-2 2xl:p-3 border-b border-gray-700 flex-shrink-0">
                            <div className="text-xs text-gray-400 truncate">
                                <span className="hidden xl:inline">Manual Override • Force AI suggestions</span>
                                <span className="xl:hidden">Manual Override</span>
                            </div>
                        </div>
                        <div className="flex-grow p-1 xl:p-2 2xl:p-2 flex flex-col justify-center min-h-0">
                            <form onSubmit={handleUserInput} className="flex gap-1 xl:gap-2 min-h-0 w-full">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={isCapturing ? "Type question..." : "Start capture..."}
                                    disabled={!isCapturing}
                                    className={`flex-1 px-1 xl:px-2 2xl:px-3 py-1 xl:py-2 border rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs xl:text-sm min-w-0 ${
                                        isCapturing 
                                            ? 'bg-gray-700 border-gray-600' 
                                            : 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-50'
                                    }`}
                                />
                                <Button 
                                    type="submit" 
                                    disabled={!userInput.trim() || !isCapturing}
                                    className="px-1 xl:px-2 2xl:px-3 py-1 xl:py-2 flex-shrink-0 h-auto"
                                >
                                    <Send className="w-3 h-3 xl:w-4 xl:h-4" />
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Bottom Left: Live Transcription */}
                    <div className="h-[40%] bg-gray-800 rounded-lg shadow-lg flex flex-col min-h-0 overflow-hidden">
                        <div className="p-1 xl:p-2 2xl:p-3 border-b border-gray-700 flex-shrink-0">
                            <h2 className="text-xs xl:text-sm 2xl:text-lg font-semibold text-blue-300">Live Transcription</h2>
                            <div className="text-xs text-gray-400 mt-1 truncate">
                                <span className="hidden xl:inline">Transcripts: {transcripts.length} • Context: {sessionContext.length}</span>
                                <span className="xl:hidden">Transcripts: {transcripts.length}</span>
                                {isCapturing && tabStream && tabStream.getAudioTracks().length === 0 && (
                                    <span className="ml-2 text-yellow-400 hidden xl:inline">• No audio</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow p-1 xl:p-2 2xl:p-3 space-y-1 xl:space-y-2 2xl:space-y-3 overflow-y-auto">
                            {transcripts.length === 0 && (
                                <div className="text-gray-400 text-center py-2 xl:py-4 2xl:py-6 text-xs">
                                    No transcripts yet. Start speaking...
                                </div>
                            )}
                            
                            {transcripts.map((block) => {
                                const isUser = block.speaker === 'You';
                                return (
                                    <div key={block.id} className={`flex items-start gap-1 xl:gap-2 ${isUser ? 'justify-end' : ''}`}>
                                        {!isUser && <UserIcon className="w-3 h-3 xl:w-4 xl:h-4 text-gray-400 mt-1 flex-shrink-0" />}
                                        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
                                            <div className={`p-1 xl:p-1.5 2xl:p-2 rounded max-w-[80%] ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                                <span className="font-semibold block text-xs">{block.speaker}</span>
                                                <p className="text-gray-200 text-xs xl:text-sm break-words">{block.text}</p>
                                            </div>
                                        </div>
                                        {isUser && <UserIcon className="w-3 h-3 xl:w-4 xl:h-4 text-blue-300 mt-1 flex-shrink-0" />}
                                    </div>
                                );
                            })}
                            
                            {/* User Override Block - appears after transcripts */}
                            {userOverride && (
                                <div className="flex items-start gap-1 xl:gap-2 justify-end">
                                    <div className="flex flex-col items-end min-w-0">
                                        <div className="p-1 xl:p-1.5 2xl:p-2 rounded max-w-[80%] bg-green-600 relative">
                                            <button
                                                onClick={() => setUserOverride(null)}
                                                className="absolute -top-1 -right-1 xl:-top-2 xl:-right-2 w-3 h-3 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0"
                                            >
                                                <X className="w-1.5 h-1.5 xl:w-2 xl:h-2 2xl:w-3 2xl:h-3 text-white" />
                                            </button>
                                            <span className="font-semibold block text-xs">User Override</span>
                                            <p className="text-gray-200 text-xs xl:text-sm break-words">{userOverride.text}</p>
                                        </div>
                                    </div>
                                    <MessageSquare className="w-3 h-3 xl:w-4 xl:h-4 text-green-300 mt-1 flex-shrink-0" />
                                </div>
                            )}
                            
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>
                </div>

                {/* Resizable divider - Desktop only */}
                <div 
                    className="w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize transition-colors relative group flex-shrink-0" 
                    onMouseDown={handleMouseDown}
                    title="Drag to resize panels"
                >
                    <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-500/20 transition-colors"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-8 bg-blue-400 rounded-full"></div>
                    </div>
                </div>

                {/* Right Side: AI Suggestion Box (Largest Component) - Desktop */}
                <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-[calc(100vh-80px)] min-h-0 overflow-hidden" style={{width: `${100 - leftPanelWidth - 1}%`}}>
                    <div className="p-4 border-b border-gray-700 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-2xl font-semibold text-green-300">AI Suggestion BOX</h2>
                                <div className="text-sm text-gray-400 mt-1 flex items-center gap-4">
                                    <span className="truncate">Interviewer questions only • Context memory • Two-stage responses • Manual override</span>
                                    {isStage2Loading && (
                                        <div className="flex items-center text-blue-400 flex-shrink-0">
                                            <Zap className="w-4 h-4 mr-1" />
                                            <span>Stage 2 enhancing...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isLoadingSuggestions && (
                                <div className="flex items-center text-gray-400 flex-shrink-0">
                                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                                    <span className="text-sm">Stage 1 generating...</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                        
                        {aiError && (
                            <div className="bg-red-900/50 border border-red-800 p-4 rounded-lg">
                                <div className="flex items-center text-red-300">
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    <span className="text-base">{aiError}</span>
                                </div>
                            </div>
                        )}
                        
                        {suggestions.length === 0 && !isLoadingSuggestions && !aiError && (
                            <div className="text-gray-400 text-center py-8">
                                <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                <h3 className="text-xl font-medium text-gray-300 mb-3">Smart AI Ready</h3>
                                <div className="text-sm text-gray-400">
                                    AI will automatically respond to any meaningful interviewer speech.<br />
                                    Your responses won't trigger AI - only client speech will.<br />
                                    Use manual input below to override when needed.
                                </div>
                            </div>
                        )}
                        
                        {suggestions.map((s, i) => (
                            <div key={i} className="bg-gray-700 p-4 rounded-lg overflow-hidden">
                                <h4 className="font-bold text-xl flex items-center mb-3">
                                    <BrainCircuit className="w-5 h-5 mr-2 text-green-400" />
                                    <span className="truncate">{s.type}</span>
                                </h4>
                                <div className="overflow-y-auto text-lg leading-relaxed">
                                    <CodeHighlighter content={s.content} />
                                </div>
                            </div>
                        ))}
                        
                        {/* Auto-scroll anchor */}
                        <div ref={aiSuggestionsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewCopilotPage;