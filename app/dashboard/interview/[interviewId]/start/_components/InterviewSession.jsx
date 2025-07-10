// Complete restructuring with fixes for all issues

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, VideoOff, Volume2, Play, AlertTriangle } from 'lucide-react';
import { useInterviewEngine } from './hooks/useInterviewEngine';
import ConversationDisplay from './ConversationDisplay';
import AudioVisualizer from './AudioVisualizer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
import { getRandomInterviewer, getInterviewerByGender, getInterviewerByIndustry } from '@/utils/interviewerProfiles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InterviewSession({ interview, useCameraInInterview }) {
  const router = useRouter();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [remainingTime, setRemainingTime] = useState(interview.duration * 60);
  const [cameraStream, setCameraStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [useNaturalSpeech, setUseNaturalSpeech] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(useCameraInInterview);
  const [interviewerGender, setInterviewerGender] = useState("random");
  const [interviewerIndustry, setInterviewerIndustry] = useState("random");

  const timerRef = useRef(null);
  const videoRef = useRef(null);

  const [selectedInterviewer, setSelectedInterviewer] = useState(() => {
    // Select interviewer and make sure it's fixed for the entire session
    let interviewer;
    if (interviewerIndustry !== "random") {
      interviewer = getInterviewerByIndustry(interviewerIndustry);
    } else if (interviewerGender !== "random") {
      interviewer = getInterviewerByGender(interviewerGender);
    } else {
      interviewer = getRandomInterviewer();
    }
    return interviewer;
  });

  const {
    conversation,
    currentUserResponse,
    interimTranscript,
    isUserSpeaking,
    isAISpeaking,
    isListening,
    error: engineError,
    startConversation,
    endConversation,
    forceProcessResponse,
    isGenerating,
    isInitialTTSLoading,
    interviewer: engineInterviewer,
    shouldUnmute
  } = useInterviewEngine(interview, isMicMuted, voiceSpeed, useNaturalSpeech, () => selectedInterviewer, setIsMicMuted);

  // Initialize media with proper camera control
  const initializeMedia = async () => {
    setIsMediaLoading(true);
    setMediaError(null);
    
    // Close any existing streams first
    if (cameraStream) {
      try {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      } catch (e) {
        console.error("Error stopping existing stream:", e);
      }
    }
    
    try {
      // Create constraints based on camera enabled setting
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: cameraEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false
      };
      
      // Request media access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log what we got
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      // Store the stream
      setCameraStream(stream);
      
      // Ensure audio tracks are muted if not in an active interview
      if (!isInterviewActive) {
        audioTracks.forEach(track => {
          track.enabled = false;
        });
      }
      
      // Connect stream to video element if we have video tracks and camera is enabled
      if (videoRef.current && videoTracks.length > 0 && cameraEnabled) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => {
          console.error("Error playing video:", e);
        });
      }
      
      setIsMediaLoading(false);
      return stream;
    } catch (error) {
      console.error("Failed to get media stream:", error.name, error.message);
      setMediaError(`Media error: ${error.message}`);
      setIsMediaLoading(false);
      return null;
    }
  };

  const startInterview = async () => {
    // Use the consistent interviewer instead of generating a new one
    
    const mediaStream = await initializeMedia();
    if (mediaStream) {
      setRemainingTime(interview.duration * 60);
      setIsInterviewActive(true);
      
      // Only unmute mic when starting the interview if it should be unmuted
      if (!isMicMuted) {
        const audioTracks = mediaStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = true;
        });
      }
      
      // Explicitly pass the selectedInterviewer to ensure consistency
      startConversation(mediaStream, selectedInterviewer);
    }
  };

  const endInterview = async () => {
    setIsInterviewActive(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    try {
      // First shut down the interview engine and camera
      endConversation();
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
      // Process Q&A pairs
      
      // Save the conversation data first
      let savedCount = 0;
      let currentQuestion = "";
      
      for (let i = 0; i < conversation.length; i++) {
        const item = conversation[i];
        
        if (item.role === 'ai') {
          currentQuestion = item.text;
        } else if (item.role === 'user' && currentQuestion && item.text) {
          try {
            await db.insert(UserAnswer).values({
              mockIdRef: interview.mockId,
              question: currentQuestion,
              userAns: item.text,
              userEmail: interview.createdBy || "",
              createdAt: new Date().toISOString()
            });
            savedCount++;
          } catch (error) {
            console.error("Error saving conversation item:", error);
          }
        }
      }
      
      
      // Show loading while triggering analysis
      setIsAnalyzing(true);
      
      // Pre-trigger analysis with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        try {
          const response = await fetch('/api/interview-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mockId: interview.mockId }),
            cache: 'no-store',
          });
          
          if (response.ok) {
            success = true;
            console.log("Analysis triggered successfully");
          } else {
            console.error("Error triggering analysis:", response.status);
            attempts++;
            // Wait before retrying
            await new Promise(r => setTimeout(r, 1000 * attempts));
          }
        } catch (error) {
          console.error("Network error triggering analysis:", error);
          attempts++;
          // Wait before retrying
          await new Promise(r => setTimeout(r, 1000 * attempts));
        }
      }
      
      // Navigate to feedback page regardless - it will handle missing data
      router.push(`/dashboard/interview/${interview.mockId}/feedback`);
    } catch (error) {
      console.error("Error during interview end process:", error);
      setIsAnalyzing(false);
      
      // Show error message
      setMediaError(`An error occurred while ending the interview: ${error.message}`);
      
      // Add a delayed redirect to feedback page anyway
      setTimeout(() => {
        router.push(`/dashboard/interview/${interview.mockId}/feedback`);
      }, 3000);
    }
  };

  // Set up timer when interview becomes active
  useEffect(() => {
    if (isInterviewActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setTimeout(() => endInterview(), 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isInterviewActive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMicrophone = () => {
    // Don't allow unmuting before the interview starts
    if (!isInterviewActive && isMicMuted) {
      console.log("Cannot unmute before interview starts");
      return;
    }
    
    // Toggle the mute state
    const newMuteState = !isMicMuted;
    console.log("Toggling microphone state to:", newMuteState ? "muted" : "unmuted");
    
    // Always set the state first
    setIsMicMuted(newMuteState);
    
    // If we have audio tracks, update them
    if (cameraStream) {
      const audioTracks = cameraStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !newMuteState;
      });
    }
    
    // Add a small delay to allow the state to propagate
    setTimeout(() => {
      console.log("Microphone state is now:", isMicMuted ? "muted" : "unmuted");
    }, 100);
  };

  const toggleCamera = () => {
    setCameraEnabled(!cameraEnabled);
    
    // Re-initialize media with new camera setting
    if (isInterviewActive) {
      initializeMedia();
    }
  };

  // Add a debounce mechanism for interim transcripts
  const [debouncedInterimTranscript, setDebouncedInterimTranscript] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInterimTranscript(interimTranscript);
    }, 300); // Show interim results after a small delay to reduce flicker
    
    return () => clearTimeout(timer);
  }, [interimTranscript]);

  // Add a confidence threshold filter
  const processTranscript = (transcript, confidence) => {
    // Only accept high-confidence results
    if (confidence < 0.6) return null; 
    
    // Clean up common transcription issues
    return transcript
      .replace(/\btimes equal sign\b/gi, "times equals")
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between words incorrectly joined
      .replace(/\s+/g, " "); // Remove extra spaces
  };

  // Add an effect to handle the shouldUnmute flag
  useEffect(() => {
    if (shouldUnmute && isMicMuted) {
      toggleMicrophone(); // This will unmute
    }
  }, [shouldUnmute, isMicMuted]);

  // Add a useEffect to log microphone state changes for debugging
  useEffect(() => {
    console.log("Microphone state changed:", isMicMuted ? "muted" : "unmuted");
  }, [isMicMuted]);

  // Then update the interviewer selection logic
  useEffect(() => {
    if (!isInterviewActive) {
      // Only allow changing interviewer before interview starts
      let newInterviewer;
      if (interviewerIndustry !== "random") {
        newInterviewer = getInterviewerByIndustry(interviewerIndustry);
      } else if (interviewerGender !== "random") {
        newInterviewer = getInterviewerByGender(interviewerGender);
      } else {
        newInterviewer = getRandomInterviewer();
      }
      setSelectedInterviewer(newInterviewer);
    }
  }, [interviewerGender, interviewerIndustry, isInterviewActive]);

  return (
    <div className="bg-gray-900 text-white">
      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold mb-3">Analyzing your interview</h2>
            <p className="text-gray-300">
              We're processing your responses and preparing your feedback.
            </p>
            <p className="text-gray-300 mt-2">
              This may take a few moments.
            </p>
          </div>
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {/* Header with interview info */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold">
                {interview.jobPosition} Interview
              </h2>
              <p className="text-sm text-gray-300">
                {interview.interviewStyle} ({interview.focus})
              </p>
            </div>
            <div className="text-xl font-mono bg-gray-700 px-3 py-1 rounded">
              {formatTime(remainingTime)}
            </div>
          </div>

          {/* Main content area - full width */}
          <div className="flex flex-col">
            {/* Video and conversation area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Camera/video area */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {cameraEnabled ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    {!cameraStream && !isMediaLoading && (
                      <div className="absolute inset-0 flex items-center justify-center text-center p-4 bg-gray-900 bg-opacity-80">
                        <div>
                          <VideoOff className="h-12 w-12 mx-auto mb-2" />
                          <p>Camera is unavailable</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 bg-gray-700 hover:bg-gray-600 text-white"
                            onClick={() => initializeMedia()}
                          >
                            Retry Camera Access
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <VideoOff className="h-12 w-12 mx-auto mb-2" />
                      <p>Camera disabled</p>
                    </div>
                  </div>
                )}

                {isMediaLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p>Setting up media...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Interviewer information */}
              <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Interviewer</p>
                <h3 className="text-xl font-semibold mb-1">{selectedInterviewer?.name || "Priya Patel"}</h3>
                <p className="text-gray-400 mb-4">{selectedInterviewer?.title || "Talent Acquisition Specialist"}</p>
                
                <p className="text-center text-sm text-gray-300 max-w-md">
                  Your interview will begin when you click the "Start Interview" button.
                  Remember to speak clearly and take your time with responses.
                </p>
              </div>
            </div>

            {/* Conversation display - full width */}
            <Card className="bg-gray-800 border-gray-700 overflow-hidden h-[calc(70vh-8rem)] mb-4">
              {isInterviewActive ? (
                <ConversationDisplayWithAutoScroll
                  conversation={conversation}
                  isAISpeaking={isAISpeaking}
                  isUserSpeaking={isUserSpeaking}
                  interimTranscript={interimTranscript}
                  isGenerating={isGenerating}
                  isInitialTTSLoading={isInitialTTSLoading}
                  interviewer={selectedInterviewer}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <p className="text-gray-300 mb-6">
                    This interview will last approximately {interview.duration} minutes.
                  </p>
                </div>
              )}
            </Card>

            {/* Bottom controls - compact row */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                {/* Voice speed control */}
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm whitespace-nowrap">Speed: {voiceSpeed}x</span>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[voiceSpeed]}
                    onValueChange={(value) => setVoiceSpeed(value[0])}
                    disabled={isInterviewActive}
                    className="w-24 cursor-pointer"
                  />
                </div>

                {/* Natural speech toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm whitespace-nowrap">Human-like pauses</span>
                  <Switch
                    id="natural-speech-toggle"
                    checked={useNaturalSpeech}
                    onCheckedChange={setUseNaturalSpeech}
                    disabled={isInterviewActive}
                  />
                </div>

                {/* Microphone status */}
                <div className="text-sm text-gray-300">
                  {isMicMuted && <span className="bg-gray-700 px-2 py-1 rounded text-xs">Microphone disabled until interview starts</span>}
                </div>
              </div>

              {/* Main interview controls */}
              <div className="flex gap-4">
                {isInterviewActive ? (
                  <>
                    <Button
                      onClick={toggleMicrophone}
                      className={`flex items-center justify-center gap-2 ${
                        isMicMuted 
                          ? "bg-red-600 hover:bg-red-700" 
                          : "bg-blue-600 hover:bg-blue-700"
                      } text-white`}
                      disabled={!isInterviewActive}
                    >
                      {isMicMuted ? (
                        <>
                          <MicOff className="h-5 w-5" />
                          <span>Unmute</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-5 w-5" />
                          <span>Mute</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={endInterview}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      End Interview
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={startInterview}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isMediaLoading}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Interview
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status banners */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 pointer-events-none">
        {isUserSpeaking && shouldUnmute && isMicMuted && (
          <div className="bg-red-900 text-white px-4 py-2 rounded-md flex items-center">
            <MicOff className="h-4 w-4 mr-2" />
            <span>Audio detected but microphone is muted</span>
          </div>
        )}

        {engineError && (
          <div className="bg-red-900 text-white px-4 py-2 rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>{engineError.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Add this component to the same file or create a new file for it
function ConversationDisplayWithAutoScroll({ 
  conversation, 
  isAISpeaking, 
  isUserSpeaking, 
  interimTranscript, 
  isGenerating, 
  isInitialTTSLoading,
  interviewer
}) {
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const previousScrollHeightRef = useRef(0);
  
  // Reset auto-scroll when conversation changes
  useEffect(() => {
    setAutoScroll(true);
  }, [conversation.length]);

  // Auto-scroll logic
  useEffect(() => {
    if (containerRef.current && autoScroll) {
      const { scrollHeight, clientHeight } = containerRef.current;
      
      // Check if content has changed since last scroll
      if (scrollHeight > previousScrollHeightRef.current) {
        containerRef.current.scrollTop = scrollHeight - clientHeight;
        previousScrollHeightRef.current = scrollHeight;
      }
    }
  }, [conversation, interimTranscript, isAISpeaking, isGenerating, autoScroll]);

  // Detect manual scroll to disable auto-scrolling
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isScrolledUp = scrollHeight - clientHeight - scrollTop > 50;
      
      if (isScrolledUp && autoScroll) {
        setAutoScroll(false);
      } else if (!isScrolledUp && !autoScroll) {
        setAutoScroll(true);
      }
    }
  };

  // Current interim transcript
  const currentInterim = interimTranscript && !isAISpeaking ? interimTranscript : "";

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {conversation.length === 0 && isInitialTTSLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">
              Preparing your interview session...
            </p>
          </div>
        ) : (
          <>
            {conversation.map((message, index) => (
              <div 
                key={index} 
                className="group"
              >
                <div className={`p-3 rounded-lg max-w-[85%] ${
                  message.role === 'ai' 
                    ? 'bg-gray-800 text-white ml-0 mr-auto' 
                    : 'bg-blue-900 text-white ml-auto mr-0'
                }`}>
                  <div className="font-medium mb-1 flex items-center">
                    {message.role === 'ai' ? (
                      <>
                        <span className="mr-2">
                          {interviewer?.name || 'Interviewer'}
                        </span>
                        {isAISpeaking && conversation[index] === conversation[conversation.length - 1] && (
                          <span className="text-blue-400 text-xs animate-pulse">Speaking...</span>
                        )}
                      </>
                    ) : (
                      'You'
                    )}
                  </div>
                  <div>{message.text}</div>
                </div>
              </div>
            ))}
            
            {/* Show interim transcript */}
            {currentInterim && (
              <div className="p-3 bg-blue-900 text-white rounded-lg max-w-[85%] ml-auto mr-0 opacity-80">
                <div className="font-medium mb-1">You</div>
                <div>
                  <span className="italic text-gray-300">{currentInterim}</span>
                </div>
              </div>
            )}
            
            {/* Loading indicator for AI response */}
            {isGenerating && (
              <div className="p-3 bg-gray-800 text-white rounded-lg max-w-[85%] ml-0 mr-auto flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button 
          onClick={() => {
            setAutoScroll(true);
          }}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}