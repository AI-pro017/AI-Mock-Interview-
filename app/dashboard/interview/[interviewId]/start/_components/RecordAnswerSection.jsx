"use client";
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
import React, { useEffect, useRef, useState } from 'react';
import Webcam from "react-webcam";
import { Button } from '@/components/ui/button';
import { Mic, StopCircle } from 'lucide-react';
import { chatSession } from '@/utils/GeminiAIModal';
import { toast } from 'sonner';
import Image from 'next/image';
import { createClient } from '@deepgram/sdk';

export default function RecordAnswerSection({ mockInterview }) {
    const [userAnswer, setUserAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [webcamEnabled, setWebcamEnabled] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isInterviewStarted, setIsInterviewStarted] = useState(false);
    const [isAwaitingAIResponse, setIsAwaitingAIResponse] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const deepgramConnectionRef = useRef(null);

    useEffect(() => {
        setIsClient(true);
        // This effect now handles both setup and cleanup
        const enableWebcam = () => {
            setWebcamEnabled(true);
        };
        enableWebcam();

        return () => {
            // This is the crucial cleanup function that runs when the component unmounts
            console.log("Cleaning up interview resources...");
            if (webcamRef.current && webcamRef.current.stream) {
                webcamRef.current.stream.getTracks().forEach(track => track.stop());
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (deepgramConnectionRef.current) {
                deepgramConnectionRef.current.finish();
            }
        };
    }, []);

    const startInterview = async () => {
        setIsInterviewStarted(true);
        setIsAwaitingAIResponse(true);
        const firstQuestion = mockInterview.jsonMockResp[0]?.question;

        try {
            const response = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: firstQuestion }),
            });
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();

            audio.onended = () => {
                setIsAwaitingAIResponse(false);
                startRecording();
            };
        } catch (e) {
            console.error(e);
            setIsAwaitingAIResponse(false);
        }
    };

    const startRecording = async () => {
        setIsRecording(true);
        setUserAnswer('');
        
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

            // Check if webcam is available, but don't block if it's not
            let stream;
            if (webcamRef.current && webcamRef.current.stream) {
                stream = webcamRef.current.stream;
            } else {
                // Get audio-only stream if webcam is not available
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            
            connection.on("open", () => {
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        connection.send(event.data);
                    }
                };
                mediaRecorder.start(250);
            });
            
            connection.on('transcript', (data) => {
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript && data.is_final) {
                    setUserAnswer(prev => prev + ' ' + transcript);
                }
            });

            connection.on('close', () => {
                console.log('Deepgram connection closed.');
            });

            deepgramConnectionRef.current = connection;
        } catch (error) {
            console.error("Error during Deepgram setup:", error);
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (deepgramConnectionRef.current) {
            deepgramConnectionRef.current.finish();
        }
        console.log("Final Answer:", userAnswer);
        setIsAwaitingAIResponse(true);
    };

    const UpdateUserAnswer = async () => {
        try {
          // Ensure mockId is available
          if (!mockInterview?.mockId) {
            console.error("mockId is missing, cannot proceed with saving the answer.");
            toast.error("Error: Mock Interview ID is missing.");
            return;
          }
      
          setLoading(true);
      
          // Create the feedback prompt for the Gemini API
          const feedbackPrompt = `Question: ${mockInterview?.jsonMockResp[0]?.question}, User Answer: ${userAnswer}. Based on the question and user answer, provide a rating and feedback.`;
      
          // Send the prompt to the Gemini API
          const result = await chatSession.sendMessage(feedbackPrompt);
      
          // Await the text response
          const rawResponse = await result.response.text();
          console.log("Raw Response from API:", rawResponse);  // Log the raw response for inspection
      
          // Check if the response is valid JSON or plain text
          let JsonFeedbackResp;
          try {
            // Attempt to parse the response as JSON
            JsonFeedbackResp = JSON.parse(rawResponse);
          } catch (jsonError) {
            console.warn("Response is not in JSON format, treating it as plain text.");
            // Since it's not JSON, treat it as plain text feedback
            JsonFeedbackResp = {
              feedback: rawResponse,  // Use the plain text as feedback
              rating: "No rating available"  // You may adjust this logic if needed
            };
          }

          // Calculate points based on feedback
          let points = 0;
          if (JsonFeedbackResp.rating === "excellent") {
              points += 10; // Full points for excellent
          } else if (JsonFeedbackResp.rating === "good") {
              points += 5; // Partial points for good
          } else if (JsonFeedbackResp.rating === "average") {
              points += 3; // Minimal points for average
          }
      
          // Insert the user answer into the database
          const resp = await db.insert(UserAnswer).values({
            mockIdRef: mockInterview?.mockId,  // Ensure mockIdRef is passed
            question: mockInterview?.jsonMockResp[0]?.question,
            correctAns: mockInterview?.jsonMockResp[0]?.answer,
            userAns: userAnswer,
            feedback: JsonFeedbackResp?.feedback || "No feedback available",
            rating: JsonFeedbackResp?.rating || "No rating available",
            userEmail: mockInterview?.createdBy,  // Assuming this is the user email
            createdAt: new Date(),
            
          });
      
          if (resp) {
            toast.success('User answer recorded successfully');
            setUserAnswer('');
          }
        } catch (error) {
          console.error("Error saving user answer:", error);
          toast.error("Failed to save the user answer.");
        } finally {
          setLoading(false);
        }
      };

      const stopUserRecording = () => {
        setIsRecording(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (deepgramConnectionRef.current) {
            deepgramConnectionRef.current.finish();
        }
        console.log("Final Answer:", userAnswer);
        
        // IMPORTANT: Call UpdateUserAnswer to save the answer to the database
        if (userAnswer.trim()) {
            UpdateUserAnswer();
        }
        
        setIsAwaitingAIResponse(true);
    };

    return (
        <div className='flex items-center justify-center flex-col'>
            <div className='relative flex flex-col justify-center items-center bg-black rounded-lg p-5'>
                <Webcam
                    ref={webcamRef}
                    onUserMedia={() => setWebcamEnabled(true)}
                    onUserMediaError={() => setWebcamEnabled(false)}
                    mirrored={true}
                    style={{ height: 300, width: '100%', zIndex: 10 }}
                />
                {isClient && !webcamEnabled && <div className='absolute z-20 text-white'>Webcam not enabled. Please enable it to continue.</div>}
            </div>

            <Button
                disabled={isAwaitingAIResponse && isInterviewStarted}
                onClick={isInterviewStarted ? (isRecording ? stopUserRecording : startRecording) : startInterview}
                className="my-10"
            >
                {isInterviewStarted ? 
                    (isRecording ? 
                        <span className='flex items-center gap-2'><StopCircle /> Stop Answering</span> : 
                        (isAwaitingAIResponse ? 'AI is Speaking...' : 'Start Answering')
                    ) 
                : 'Start Interview'}
            </Button>
        </div>
    );
}
