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

// This function now safely checks for client-side environment first
function safelyAccessCamera(video = true) {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error("Media device access not supported."));
  }
  return navigator.mediaDevices.getUserMedia({ video, audio: true });
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
    let stream;
    try {
      stream = useCameraInInterview 
        ? await safelyAccessCamera(true)
        : await safelyAccessCamera(false);
    } catch (error) {
      console.warn("Camera access failed, trying audio-only.", error);
      try {
        stream = await safelyAccessCamera(false);
        setMediaError("Camera not available. Using audio only.");
      } catch (audioError) {
        console.error("Fatal: Could not access microphone.", audioError);
        setMediaError("Microphone access is required and was denied.");
        setIsMediaLoading(false);
        return null;
      }
    }
    
    setIsMediaLoading(false);
    setCameraStream(stream);
    if (stream && useCameraInInterview && videoRef.current) {
      videoRef.current.srcObject = stream;
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
                onClick={() => setIsMicMuted(!isMicMuted)}
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
            {useCameraInInterview && cameraStream && !mediaError?.includes("Camera") ? (
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
                <p>{isMediaLoading ? "Requesting media..." : mediaError || "Camera is disabled"}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
} 