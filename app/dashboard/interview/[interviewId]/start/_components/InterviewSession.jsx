"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, StopCircle, Play, Volume2, VideoOff } from 'lucide-react';
import { createClient } from '@deepgram/sdk';

// Add this safeguard function at the beginning of the file
function safelyAccessCamera() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return Promise.reject(new Error("Camera access is not supported in this environment"));
  }
  return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
}

export default function InterviewSession({ interview, useCameraInInterview }) {
  // Interview state
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentUserResponse, setCurrentUserResponse] = useState('');
  const [remainingTime, setRemainingTime] = useState(interview.duration * 60); // in seconds
  
  // Add camera state
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  // Timer ref
  const timerRef = useRef(null);
  
  // Media refs
  const webcamRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const deepgramConnectionRef = useRef(null);
  
  // Initialize camera only when interview starts and if enabled
  const initializeCamera = async () => {
    if (!useCameraInInterview) return;
    
    setIsCameraLoading(true);
    setCameraError(null);
    
    try {
      // Use our safe accessor function
      const stream = await safelyAccessCamera();
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraError(error.message || "Could not access camera");
      
      // Fall back to audio-only mode
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setCameraStream(audioStream); // We'll use this for audio only
      } catch (audioError) {
        console.error("Audio access error:", audioError);
        // At this point we can't access audio either
      }
    } finally {
      setIsCameraLoading(false);
    }
  };
  
  // Start the interview
  const startInterview = async () => {
    setIsInterviewActive(true);
    
    // Initialize camera if needed
    if (useCameraInInterview) {
      await initializeCamera();
    }
    
    // Start timer
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
    
    // Generate first AI response
    await generateAIResponse('greeting');
  };
  
  // End the interview
  const endInterview = () => {
    setIsInterviewActive(false);
    clearInterval(timerRef.current);
    
    // Clean up media resources
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (deepgramConnectionRef.current) {
      deepgramConnectionRef.current.finish();
    }
    
    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };
  
  // Generate AI response and speak it
  const generateAIResponse = async (type) => {
    setIsAISpeaking(true);
    
    let prompt;
    if (type === 'greeting') {
      prompt = `You are conducting a job interview for a ${interview.jobPosition} position. 
                The candidate has ${interview.jobExperience} years of experience. 
                Give a brief welcome greeting and ask the first interview question.`;
    } else {
      // Include previous conversation for context
      const conversationHistory = conversation.map(item => 
        `${item.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${item.text}`
      ).join('\n');
      
      prompt = `Based on this interview conversation so far:
                ${conversationHistory}
                
                The candidate just said: "${currentUserResponse}"
                
                You are the interviewer for a ${interview.jobPosition} position. 
                Respond naturally to what they just said and ask a follow-up question or move to a new topic.
                Keep your response concise and conversational.`;
    }
    
    try {
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          role: interview.jobPosition,
          interviewStyle: interview.interviewStyle,
          focus: interview.focus
        })
      });
      
      const data = await response.json();
      const aiText = data.response;
      
      // Add to conversation history
      setConversation(prev => [...prev, { role: 'ai', text: aiText }]);
      
      // Speak the response using ElevenLabs
      await speakText(aiText);
      
      setIsAISpeaking(false);
      
      // After AI speaks, it's the user's turn
      if (isInterviewActive) {
        startUserRecording();
      }
      
    } catch (error) {
      console.error("Error generating AI response:", error);
      setIsAISpeaking(false);
    }
  };
  
  // Text-to-speech using ElevenLabs
  const speakText = async (text) => {
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsAISpeaking(false);
      };
      
      audio.play();
    } catch (error) {
      console.error("Error converting text to speech:", error);
      setIsAISpeaking(false);
    }
  };
  
  // Start recording the user's response
  const startUserRecording = async () => {
    setIsUserSpeaking(true);
    setCurrentUserResponse('');
    
    try {
      const response = await fetch('/api/deepgram');
      const data = await response.json();
      const { deepgramToken } = data;
      
      const deepgram = createClient(deepgramToken);
      const connection = deepgram.listen.live({
        model: "nova-2",
        language: "en-US",
        smart_format: true,
        interim_results: true,
      });
      
      // Try to get a stream for recording
      let stream;
      try {
        if (cameraStream) {
          stream = cameraStream;
        } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw new Error("Cannot access microphone");
        }
      } catch (error) {
        console.error("Media access error:", error);
        setIsUserSpeaking(false);
        return;
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          connection.send(event.data);
        }
      };
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      
      connection.on("open", () => {
        // Connection opened, recording should be active
      });
      
      connection.on('transcript', (data) => {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript && data.is_final) {
          setCurrentUserResponse(prev => prev + ' ' + transcript);
        }
      });
      
      deepgramConnectionRef.current = connection;
    } catch (error) {
      console.error("Error during Deepgram setup:", error);
      setIsUserSpeaking(false);
    }
  };
  
  // Stop recording the user's response
  const stopUserRecording = () => {
    setIsUserSpeaking(false);
    
    // Stop media recorder if it exists
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Close Deepgram connection
    if (deepgramConnectionRef.current) {
      deepgramConnectionRef.current.finish();
    }
    
    // Add user's response to conversation history
    if (currentUserResponse.trim()) {
      setConversation(prev => [...prev, { 
        role: 'user', 
        text: currentUserResponse.trim() 
      }]);
      
      // Generate AI response to what the user said
      generateAIResponse('response');
    } else {
      // If no response was captured, let user try again
      setIsUserSpeaking(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (deepgramConnectionRef.current) {
        deepgramConnectionRef.current.finish();
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);
  
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Left side - Conversation and controls */}
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
            
            <Button 
              variant={isInterviewActive ? "destructive" : "default"}
              onClick={isInterviewActive ? endInterview : startInterview}
              disabled={isAISpeaking}
            >
              {isInterviewActive ? "End Interview" : "Start Interview"}
            </Button>
          </div>
          
          {/* Conversation transcript */}
          <div className="h-96 overflow-y-auto border rounded-md p-4 mb-4 bg-gray-50">
            {conversation.length === 0 && !isInterviewActive ? (
              <div className="text-center text-gray-500 h-full flex items-center justify-center">
                <p>The interview transcript will appear here. Click "Start Interview" to begin.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((item, index) => (
                  <div key={index} className={`p-3 rounded-lg ${item.role === 'ai' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <div className="font-bold">
                      {item.role === 'ai' ? 'Interviewer' : 'You'}
                    </div>
                    <div>{item.text}</div>
                  </div>
                ))}
                
                {isAISpeaking && (
                  <div className="p-3 rounded-lg bg-blue-100 animate-pulse">
                    <div className="font-bold">Interviewer</div>
                    <div>Speaking...</div>
                  </div>
                )}
                
                {isUserSpeaking && (
                  <div className="p-3 rounded-lg bg-green-100">
                    <div className="font-bold">You</div>
                    <div>{currentUserResponse || "Listening to your response..."}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Recording controls */}
          <div className="flex justify-center">
            {isInterviewActive && !isAISpeaking && (
              <Button 
                variant={isUserSpeaking ? "destructive" : "default"} 
                size="lg"
                onClick={isUserSpeaking ? stopUserRecording : startUserRecording}
                disabled={isAISpeaking}
                className="w-64"
              >
                {isUserSpeaking ? (
                  <span className="flex items-center gap-2"><StopCircle className="animate-pulse" /> Stop Answering</span>
                ) : (
                  <span className="flex items-center gap-2"><Mic /> Start Answering</span>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
      
      {/* Right side - Camera */}
      <div className="lg:col-span-2">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Camera Feed</h2>
          <div className="bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            {/* Video element for camera display */}
            {useCameraInInterview && (
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline
                style={{ 
                  display: cameraStream ? 'block' : 'none',
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  minHeight: '400px'
                }} 
              />
            )}
            
            {/* Loading state */}
            {isCameraLoading && (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <p>Requesting camera access...</p>
              </div>
            )}
            
            {/* Error state */}
            {cameraError && (
              <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                <VideoOff className="h-12 w-12 mb-2" />
                <p>Camera error: {cameraError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={initializeCamera} 
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {/* Camera disabled or not started */}
            {!useCameraInInterview && (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <VideoOff className="h-12 w-12 mb-2" />
                <p>Camera disabled for this interview</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
} 