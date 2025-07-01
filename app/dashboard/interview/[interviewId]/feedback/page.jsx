"use client"
import { db } from '@/utils/db';
import { UserAnswer, InterviewReport } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import React, { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { BarChart, Speech, Zap, Smile, BrainCircuit, BookCheck } from 'lucide-react';

function Feedback({ params }) {
  const [interviewReport, setInterviewReport] = useState(null);
  const [detailedFeedback, setDetailedFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getAndGenerateFeedback = async () => {
      setIsLoading(true);
      setError(null);
      
      // First, check if a report already exists.
      // NOTE: This check now correctly runs on the server-side via the API.
      // We will trigger our API to do the check and generation.
      try {
        const response = await fetch(`/api/interview-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mockId: params.interviewId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch or generate feedback.');
        }

        // After the analysis is done (or was already done), we can fetch the results.
        const reportResult = await db.select().from(InterviewReport).where(eq(InterviewReport.mockIdRef, params.interviewId));
        const answersResult = await db.select().from(UserAnswer).where(eq(UserAnswer.mockIdRef, params.interviewId)).orderBy(UserAnswer.id);

        if (reportResult.length > 0) {
          setInterviewReport(reportResult[0]);
          setDetailedFeedback(answersResult);
        } else {
          throw new Error("Report could not be found after generation.");
        }

      } catch (e) {
        console.error("Error during feedback retrieval:", e);
        setError("Sorry, we couldn't generate your feedback report at this time.");
      }
      
      setIsLoading(false);
    };

    getAndGenerateFeedback();
  }, [params.interviewId]);

  if (isLoading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-gray-700">Generating your feedback report...</h2>
        <p className="text-gray-500 mt-2">This might take a moment. Please don't refresh the page.</p>
        <Progress value={50} className="w-1/3 mt-4 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
        <div className="p-10 text-center">
            <h2 className='font-bold text-xl text-red-500'>{error}</h2>
            <Button onClick={() => router.replace('/dashboard')} className="mt-4">Go to Dashboard</Button>
        </div>
    )
  }
  
  // ... rest of the component is unchanged
  if (!interviewReport) {
    return (
        <div className="p-10 text-center">
            <h2 className='font-bold text-xl text-gray-500'>No Interview Feedback Report Found</h2>
            <p className="text-gray-500 mt-2">It seems the analysis for this interview has not been completed yet.</p>
            <Button onClick={() => router.replace('/dashboard')} className="mt-4">Go to Dashboard</Button>
        </div>
    )
  }

  return (
    <div className='p-4 md:p-10 bg-gray-50 min-h-screen'>
      <h2 className='text-3xl font-bold text-gray-800'>Interview Performance Report</h2>
      <p className='text-gray-600 mt-1'>Here's a detailed breakdown of your performance.</p>

      {/* Overall Performance Section */}
      <div className='mt-8 p-6 bg-white rounded-xl shadow-md'>
        <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
            <BarChart className="mr-3 text-blue-500" />
            Overall Summary
        </h3>
        <div className="mt-4 grid md:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700">Overall Score</p>
                <p className="text-4xl font-bold text-blue-600">{interviewReport.overallScore}/100</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg md:col-span-2 text-left">
                <p className="text-sm font-medium text-green-700">Strengths</p>
                <p className="text-gray-700 mt-1">{interviewReport.strengths}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg md:col-span-3 text-left">
                <p className="text-sm font-medium text-red-700">Areas for Improvement</p>
                <p className="text-gray-700 mt-1">{interviewReport.weaknesses}</p>
            </div>
             <div className="p-4 bg-yellow-50 rounded-lg md:col-span-3 text-left">
                <p className="text-sm font-medium text-yellow-800">Your Personalized Improvement Plan</p>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{interviewReport.improvementPlan}</p>
            </div>
        </div>
      </div>

      {/* Detailed Question-by-Question Analysis */}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Detailed Analysis</h3>
        {detailedFeedback.map((item, index) => (
          <Collapsible key={index} className='mb-4 bg-white rounded-xl shadow-sm overflow-hidden'>
            <CollapsibleTrigger className='p-4 bg-gray-50 hover:bg-gray-100 flex justify-between items-center w-full text-left'>
              <span className="font-semibold text-gray-700">{index + 1}. {item.question}</span>
              <div className="flex items-center">
                <span className={`font-bold mr-4 ${item.rating >= 7 ? 'text-green-600' : item.rating >= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {item.rating}/10
                </span>
                <ChevronsUpDown className='h-5 w-5 text-gray-500' />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t border-gray-200">
              <div className='flex flex-col gap-4'>
                <div>
                    <h4 className="font-semibold text-gray-600">Your Answer:</h4>
                    <p className="p-3 mt-1 border rounded-lg bg-gray-50 text-gray-800">{item.userAns || "No answer provided."}</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-gray-600">AI Feedback:</h4>
                    <p className="p-3 mt-1 border rounded-lg bg-blue-50 text-blue-800">{item.feedback}</p>
                </div>

                {/* Analysis Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    <MetricItem icon={<Speech />} label="Clarity" value={item.clarityScore} />
                    <MetricItem icon={<Zap />} label="Pace" value={item.paceScore} />
                    <MetricItem icon={<Smile />} label="Confidence" value={item.confidenceScore} />
                    <MetricItem icon={<BrainCircuit />} label="Technical" value={item.technicalScore} />
                    <MetricItem icon={<BookCheck />} label="Grammar" value={item.grammarScore} />
                    <MetricItem icon={<Speech />} label="Filler Words" value={item.fillerWords} isCount={true} />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <Button onClick={() => router.replace('/dashboard')}>Back to Dashboard</Button>
      </div>
    </div>
  );
}

const MetricItem = ({ icon, label, value, isCount = false }) => (
    <div className="flex items-center p-2 bg-gray-100 rounded-lg">
        <div className="text-gray-500">{icon}</div>
        <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-lg font-semibold text-gray-900">{value}{isCount ? '' : '/10'}</p>
        </div>
    </div>
);

export default Feedback;
