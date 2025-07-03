// Complete restructuring with fixes for all issues

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, VideoOff, Volume2, Play } from 'lucide-react';
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

  const getAppropriateInterviewer = () => {
    if (interviewerIndustry !== "random") {
      return getInterviewerByIndustry(interviewerIndustry);
    }
    
    if (interviewerGender !== "random") {
      return getInterviewerByGender(interviewerGender);
    }
    
    return getRandomInterviewer();
  };

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
    interviewer,
    shouldUnmute
  } = useInterviewEngine(interview, isMicMuted, voiceSpeed, useNaturalSpeech, getAppropriateInterviewer, setIsMicMuted);

  // Initialize media with proper camera control
  const initializeMedia = async () => {
    setIsMediaLoading(true);
    setMediaError(null);
    
    console.log("Initializing media, camera enabled:", cameraEnabled);
    
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
      
      console.log("Requesting media with constraints:", JSON.stringify(constraints));
      
      // Request media access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log what we got
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log(`Acquired stream with ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);
      
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
    // Get the interviewer before starting
    const selectedInterviewer = getAppropriateInterviewer();
    console.log("Starting interview with interviewer:", selectedInterviewer.name);
    
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
      
      // Pass the selected interviewer directly
      startConversation(mediaStream, selectedInterviewer);
    }
  };

  const endInterview = async () => {
    console.log("Ending interview");
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
      console.log("Conversation data at end:", conversation.length, "items");
      
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
      
      console.log(`Saved ${savedCount} Q&A pairs to database`);
      
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
    
    const newMuteState = !isMicMuted;
    setIsMicMuted(newMuteState);
    
    if (cameraStream) {
      const audioTracks = cameraStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !newMuteState;
      });
    }
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

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with title and timer - fixed at top */}
      <div className="bg-white z-10 pt-4 pb-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {interview.jobPosition} Interview <span className="text-gray-500 font-normal">({interview.interviewStyle}, {interview.focus} Focus)</span>
          </h2>
          <div className="flex items-center gap-4">
            <div className="font-medium">Time Remaining: {formatTime(remainingTime)}</div>
            <Button 
              variant={isInterviewActive ? "destructive" : "default"}
              onClick={isInterviewActive ? endInterview : startInterview}
              className="px-4 py-2 flex items-center gap-2"
              disabled={isMediaLoading || isAnalyzing}
            >
              {isInterviewActive ? (
                "End Interview"
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Interview
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Controls section - fixed at top with sticky behavior */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Left column: Voice settings */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-3">Voice Settings</h3>
            
            <div className="space-y-4">
              {/* Voice Speed Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span>Voice Speed: {voiceSpeed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.1" 
                  value={voiceSpeed} 
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Natural Speech Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Natural Speech Patterns</div>
                  <div className="text-xs text-gray-500">Enable more human-like pauses and intonation</div>
                </div>
                <Switch checked={useNaturalSpeech} onCheckedChange={setUseNaturalSpeech} />
              </div>
              
              {/* Background Noise Filtering */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Background Noise Filtering</div>
                  <div className="text-xs text-gray-500">Reduces background noise in voice recognition</div>
                </div>
                <Switch checked={true} onCheckedChange={() => {}} />
              </div>
              
              {/* Audio Visualizer - Shows voice input */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Voice Input</div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      onClick={toggleMicrophone}
                      variant={isMicMuted ? "destructive" : "default"}
                      className="flex items-center gap-1"
                      disabled={isAISpeaking || isInitialTTSLoading || (isGenerating && !isAISpeaking) || (!isInterviewActive && isMicMuted)}
                    >
                      {isMicMuted ? (
                        <>
                          <MicOff className="w-4 h-4" /> {isInterviewActive ? "Unmute" : "Disabled until interview starts"}
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" /> {isListening ? "Mute" : "Disabled"}
                        </>
                      )}
                    </Button>
                    
                    {/* Clear indicator of mic status */}
                    <div className="text-sm">
                      {!isInterviewActive && isMicMuted ? (
                        <span className="text-amber-500">Microphone disabled until interview starts</span>
                      ) : isInitialTTSLoading ? (
                        <span className="text-amber-500">Microphone disabled during interview loading</span>
                      ) : isGenerating && !isAISpeaking ? (
                        <span className="text-amber-500">Microphone disabled while loading voice</span>
                      ) : isAISpeaking ? (
                        <span className="text-amber-500">Microphone disabled while AI is speaking</span>
                      ) : isListening ? (
                        <span className="text-green-500">Microphone active - speak now</span>
                      ) : (
                        <span className="text-gray-500">Microphone inactive</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-16 bg-gray-100 rounded-md overflow-hidden">
                  <AudioVisualizer 
                    audioStream={cameraStream}
                    isActive={isUserSpeaking && !isMicMuted}
                    className="w-full h-full"
                  />
                  {debouncedInterimTranscript && (
                    <div className="text-xs p-2 bg-gray-100 text-gray-700">
                      {processTranscript(debouncedInterimTranscript, 0.8)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column: Camera feed */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Camera Feed</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCamera}
                className="flex items-center gap-1"
              >
                {cameraEnabled ? "Disable Camera" : "Enable Camera"}
              </Button>
            </div>
            
            <div className="aspect-video bg-gray-900 rounded-md overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Camera Overlay - Show when camera is disabled or not available */}
              {(!cameraEnabled || !cameraStream || (cameraStream && cameraStream.getVideoTracks().length === 0)) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-80">
                  <div className="text-center p-4">
                    <VideoOff className="mx-auto w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">Camera is {cameraEnabled ? "unavailable" : "disabled"}</p>
                    {cameraEnabled && (
                      <Button 
                        className="mt-4" 
                        variant="secondary"
                        onClick={initializeMedia}
                      >
                        Retry Camera Access
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Conversation display - scrollable area below fixed controls */}
      <ConversationDisplayWithAutoScroll 
        conversation={conversation} 
        isAISpeaking={isAISpeaking} 
        isUserSpeaking={isUserSpeaking}
        interimTranscript={debouncedInterimTranscript}
        isGenerating={isGenerating}
        isInitialTTSLoading={isInitialTTSLoading}
        interviewer={interviewer}
      />

      {/* Show loading or error messages if present */}
      {(isMediaLoading || isAnalyzing || mediaError || engineError) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            {isMediaLoading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg font-medium">Initializing media devices...</p>
              </div>
            )}
            
            {isAnalyzing && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg font-medium">Analyzing interview responses...</p>
              </div>
            )}
            
            {(mediaError || engineError) && (
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-red-700 mb-2">Error</p>
                <p className="text-gray-700">
                  {/* Safely extract error message from Error objects */}
                  {mediaError ? (typeof mediaError === 'object' ? 
                    (mediaError?.message || 'Unknown media error') : mediaError) : ''}
                  {engineError ? (typeof engineError === 'object' ? 
                    (engineError?.message || 'Unknown engine error') : engineError) : ''}
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => {
                    setMediaError(null);
                    setError(null);
                  }}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
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
  const scrollContainerRef = useRef(null);
  
  // Auto-scroll to bottom when conversation changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [conversation, interimTranscript]);
  
  return (
    <div 
      ref={scrollContainerRef} 
      className="flex-grow bg-white rounded-lg shadow-sm overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 350px)' }}
    >
      <div className="p-4">
        {/* Display interviewer info at the beginning when no conversation yet */}
        {interviewer && conversation.length === 0 && !isAISpeaking && !isInitialTTSLoading && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50">
            <div className="font-medium mb-1">Your Interviewer</div>
            <p className="text-sm text-blue-800">
              {interviewer.name}, {interviewer.title} at {interviewer.company}
            </p>
          </div>
        )}
        
        {/* If we're loading TTS and there's no conversation yet, show loading indicator */}
        {isInitialTTSLoading && conversation.length === 0 && (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading interview...</p>
          </div>
        )}
        
        {/* Display conversation items */}
        {conversation.map((item, index) => (
          <div 
            key={index} 
            className={`mb-4 p-4 rounded-lg ${
              item.role === 'ai' ? 'bg-blue-50' : 'bg-gray-100'
            }`}
          >
            <div className="font-medium mb-1">
              {item.role === 'ai' ? 'Interviewer' : 'You'}
              {item.role === 'ai' && isAISpeaking && index === conversation.length - 1 && (
                <span className="ml-2 text-blue-500 text-sm animate-pulse">Speaking...</span>
              )}
            </div>
            <div>{item.text}</div>
          </div>
        ))}
        
        {/* Show "Loading voice..." when generating but not yet speaking */}
        {isGenerating && !isAISpeaking && !isInitialTTSLoading && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50">
            <div className="font-medium mb-1">
              Interviewer <span className="ml-2 text-amber-500 text-sm animate-pulse">Loading voice...</span>
            </div>
          </div>
        )}
        
        {/* Show interim transcript when user is speaking */}
        {isUserSpeaking && interimTranscript && (
          <div className="mb-4 p-4 rounded-lg bg-gray-100 border border-gray-300 border-dashed">
            <div className="font-medium mb-1">
              You <span className="ml-2 text-blue-500 text-sm animate-pulse">Speaking...</span>
            </div>
            <div className="text-gray-600">{interimTranscript}</div>
          </div>
        )}
      </div>
    </div>
  );
}