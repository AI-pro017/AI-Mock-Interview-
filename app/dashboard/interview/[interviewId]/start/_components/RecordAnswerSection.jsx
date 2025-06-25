"use client";
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
import React, { useEffect, useState } from 'react';
import Webcam from "react-webcam";
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import useSpeechToText from 'react-hook-speech-to-text';
import { chatSession } from '@/utils/GeminiAIModal';
import { toast } from 'sonner';

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
    const [userAnswer, setUserAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    const {
        isRecording,
        results,
        startSpeechToText,
        stopSpeechToText,
        setResults
    } = useSpeechToText({
        continuous: true,
        useLegacyResults: false,
    });

    // Collect the speech-to-text result and append to userAnswer
    useEffect(() => {
        results.forEach(result => setUserAnswer(prevAns => prevAns + result?.transcript));
    }, [results]);

    // Automatically save the answer when recording stops and userAnswer is long enough
    useEffect(() => {
        if (!isRecording && userAnswer.length > 10) {
            UpdateUserAnswer();
        }
    }, [userAnswer]);

    const StartStopRecording = () => {
        if (isRecording) {
            stopSpeechToText();
        } else {
            startSpeechToText();
        }
    };

    const UpdateUserAnswer = async () => {
        try {
          // Ensure mockId is available
          if (!interviewData?.mockId) {
            console.error("mockId is missing, cannot proceed with saving the answer.");
            toast.error("Error: Mock Interview ID is missing.");
            return;
          }
      
          setLoading(true);
      
          // Create the feedback prompt for the Gemini API
          const feedbackPrompt = `Question: ${mockInterviewQuestion[activeQuestionIndex]?.question}, User Answer: ${userAnswer}. Based on the question and user answer, provide a rating and feedback.`;
      
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
            mockIdRef: interviewData?.mockId,  // Ensure mockIdRef is passed
            question: mockInterviewQuestion[activeQuestionIndex]?.question,
            correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
            userAns: userAnswer,
            feedback: JsonFeedbackResp?.feedback || "No feedback available",
            rating: JsonFeedbackResp?.rating || "No rating available",
            userEmail: interviewData?.createdBy,  // Assuming this is the user email
            createdAt: new Date(),
            
          });
      
          if (resp) {
            toast.success('User answer recorded successfully');
            setUserAnswer('');
            setResults([]);
          }
        } catch (error) {
          console.error("Error saving user answer:", error);
          toast.error("Failed to save the user answer.");
        } finally {
          setResults([]);
          setLoading(false);
        }
      };
      
      

    return (
        <div className='flex items-center justify-center flex-col'>
            {/* Webcam Section */}
            <div className='flex flex-col mt-20 justify-center items-center bg-black rounded-lg p-5 relative'>
                <Webcam
                    mirrored={true}
                    style={{
                        height: 300,
                        width: '100%',
                        zIndex: 10,
                    }}
                />
            </div>

            {/* Record Answer Button */}
            <Button
                disabled={loading}
                variant="outline"
                className="my-10"
                onClick={StartStopRecording}
            >
                {isRecording ?
                    <h2 className='text-red-600 flex gap-2'>
                        <Mic /> Stop Recording
                    </h2>
                    : 'Record Answer'
                }
            </Button>
        </div>
    );
}

export default RecordAnswerSection;
