"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, VideoOff, Volume2 } from 'lucide-react';
import { useInterviewEngine } from './hooks/useInterviewEngine';
import ConversationDisplay from './ConversationDisplay';
import AudioVisualizer from './AudioVisualizer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// This function safely checks for client-side environment and handles permissions better
function safelyAccessCamera(video = true) {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error("Media device access not supported."));
  }
  
  // Create constraints object based on whether video is requested
  const constraints = { 
    audio: true,
    video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false 
  };
  
  return navigator.mediaDevices.getUserMedia(constraints)
    .catch((error) => {
      console.error("Media access error:", error.name, error.message);
      
      // Return more specific error messages based on the error type
      if (error.name === 'NotAllowedError') {
        throw new Error("Camera/microphone permission denied. Please check your browser settings.");
      } else if (error.name === 'NotFoundError') {
        throw new Error("No camera/microphone found. Please check your device connections.");
      } else if (error.name === 'NotReadableError') {
        throw new Error("Camera/microphone is already in use by another application.");
      } else {
        throw error; // Re-throw other errors
      }
    });
}

export default function InterviewSession({ interview, useCameraInInterview }) {
  const router = useRouter();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [remainingTime, setRemainingTime] = useState(interview.duration * 60);
  const [cameraStream, setCameraStream] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [useNaturalSpeech, setUseNaturalSpeech] = useState(true);

  const timerRef = useRef(null);
  const videoRef = useRef(null);

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
  } = useInterviewEngine(interview, isMicMuted, voiceSpeed, useNaturalSpeech);

  const initializeMedia = async () => {
    setIsMediaLoading(true);
    setMediaError(null);
    
    // First, check if we have permission already
    try {
      // Attempt to get permissions status if the browser supports it
      if (navigator.permissions && navigator.permissions.query) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' });
        
        // Camera permission check only if camera is enabled
        let cameraPermission = { state: 'granted' }; // Default if not needed
        if (useCameraInInterview) {
          try {
            cameraPermission = await navigator.permissions.query({ name: 'camera' });
          } catch (e) {
            console.log("Camera permission query not supported", e);
          }
        }
        
        // If either permission is denied, show a clear error message
        if (micPermission.state === 'denied' || (useCameraInInterview && cameraPermission.state === 'denied')) {
          const errorMsg = `${micPermission.state === 'denied' ? 'Microphone' : ''}${(micPermission.state === 'denied' && useCameraInInterview && cameraPermission.state === 'denied') ? ' and ' : ''}${(useCameraInInterview && cameraPermission.state === 'denied') ? 'Camera' : ''} permission denied. Please allow access in your browser settings.`;
          setMediaError(errorMsg);
          setIsMediaLoading(false);
          return null;
        }
      }
    } catch (permError) {
      console.log("Permission query not supported", permError);
    }
    
    // Now attempt to access the media
    let stream;
    try {
      // Try to get the requested media (with or without camera)
      stream = useCameraInInterview 
        ? await safelyAccessCamera(true)
        : await safelyAccessCamera(false);
        
      // If we succeeded with camera, ensure we properly set up the video element
      if (stream && useCameraInInterview) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
          console.log("Camera accessed successfully:", videoTracks[0].label);
        }
      }
    } catch (error) {
      console.warn("Media access failed:", error.message);
      
      // If camera access failed but camera was requested, try audio-only as fallback
      if (useCameraInInterview) {
        try {
          console.log("Falling back to audio-only");
          stream = await safelyAccessCamera(false);
          setMediaError("Camera access failed: " + error.message + ". Using audio only.");
        } catch (audioError) {
          console.error("Fatal: Could not access microphone either.", audioError);
          setMediaError("Interview cannot start: " + audioError.message);
          setIsMediaLoading(false);
          return null;
        }
      } else {
        // This is a direct audio-only failure
        setMediaError("Microphone access failed: " + error.message);
        setIsMediaLoading(false);
        return null;
      }
    }
    
    // Success path - we have a stream
    setIsMediaLoading(false);
    setCameraStream(stream);
    
    // Set up video element if we have video tracks and the reference exists
    if (stream && videoRef.current) {
      const hasVideoTracks = stream.getVideoTracks().length > 0;
      
      if (hasVideoTracks) {
        videoRef.current.srcObject = stream;
        console.log("Video stream attached to video element");
      } else {
        console.log("No video tracks available in the stream");
      }
    }
    
    return stream;
  };

  const startInterview = async () => {
    const mediaStream = await initializeMedia();
    if (mediaStream) {
      setIsInterviewActive(true);
      startConversation(mediaStream);
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            endInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const endInterview = () => {
    setIsInterviewActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    endConversation();
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    router.push(`/dashboard/interview/${interview.mockId}/feedback`);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVoiceSpeedChange = (value) => {
    setVoiceSpeed(value[0]);
  };

  const currentError = engineError || mediaError;

  // Add this function to handle mic muting properly
  const toggleMicrophone = () => {
    // Update the UI state
    setIsMicMuted(!isMicMuted);
    
    // If we have an active camera stream, directly mute/unmute the audio tracks
    if (cameraStream) {
      const audioTracks = cameraStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMicMuted; // Note: we're using the current state before update
        console.log(`Audio track ${track.label} ${isMicMuted ? 'unmuted' : 'muted'}`);
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {interview.jobPosition} Interview
            <span className="ml-2 text-lg font-normal text-gray-500">
              ({interview.interviewStyle}, {interview.focus} Focus)
            </span>
          </h2>

          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">
              Time Remaining: <span className="text-primary">{formatTime(remainingTime)}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMicrophone}
                disabled={!isInterviewActive}
                className={isMicMuted ? "bg-red-100" : ""}
              >
                {isMicMuted ? <MicOff /> : <Mic />}
              </Button>
              <Button
                variant={isInterviewActive ? "destructive" : "default"}
                onClick={isInterviewActive ? endInterview : startInterview}
                disabled={isMediaLoading}
              >
                {isMediaLoading ? "Starting..." : isInterviewActive ? "End Interview" : "Start Interview"}
              </Button>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="flex flex-col gap-3 mb-4 p-3 border rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700">Voice Settings</h3>
            
            {/* Voice Speed Control */}
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Voice Speed: {voiceSpeed.toFixed(1)}x</p>
                <Slider
                  defaultValue={[1.0]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={handleVoiceSpeedChange}
                  disabled={!isInterviewActive}
                />
              </div>
            </div>
            
            {/* Natural Speech Toggle */}
            <div className="flex items-center justify-between mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="natural-speech">Natural Speech Patterns</Label>
                <p className="text-xs text-gray-500">Enable more human-like pauses and intonation</p>
              </div>
              <Switch
                id="natural-speech"
                checked={useNaturalSpeech}
                onCheckedChange={setUseNaturalSpeech}
                disabled={!isInterviewActive}
              />
            </div>
          </div>

          <ConversationDisplay
            conversation={conversation}
            isAISpeaking={isAISpeaking}
            isUserSpeaking={isUserSpeaking}
            currentUserResponse={currentUserResponse}
            interimTranscript={interimTranscript}
          />

          <div className="h-16 mt-2 text-sm text-gray-500 text-center">
            {isInterviewActive ? (
                <AudioVisualizer audioStream={cameraStream} />
            ) : (
                <div className="h-full w-full bg-gray-100 rounded-md flex items-center justify-center">
                    <p>Audio visualizer will appear here</p>
                </div>
            )}
          </div>

          <div className="h-8 mt-2 text-sm text-gray-500 text-center">
            {isListening && !isUserSpeaking && !isAISpeaking && (
              <p className="animate-pulse">Listening...</p>
            )}
          </div>

          {currentError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md">
              <p className="font-bold">An error occurred:</p>
              <p className="text-sm mt-1">{currentError.toString()}</p>
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Camera Feed</h2>
          <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
            {cameraStream && cameraStream.getVideoTracks().length > 0 ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                <VideoOff className="h-12 w-12 mb-2" />
                <p>{isMediaLoading ? "Requesting media..." : 
                    useCameraInInterview && mediaError ? mediaError : "Camera is disabled"}</p>
                {useCameraInInterview && !isMediaLoading && (
                  <div className="mt-4 max-w-md">
                    <p className="text-sm text-gray-400">
                      To enable your camera, check the camera permissions in your browser settings 
                      and ensure no other application is using your camera.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
} 