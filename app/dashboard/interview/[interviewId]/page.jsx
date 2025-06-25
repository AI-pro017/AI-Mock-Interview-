"use client";
import { Button } from "@/components/ui/button";
import { db } from "@/utils/db";
import { MockInterview } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { Lightbulb, WebcamIcon } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import Webcam from "react-webcam";

function Interview({ params }) {
  const [interviewData, setInterviewData] = useState(null);
  const [webCamEnabled, setWebCamEnabled] = useState(false);

  useEffect(() => {
    if (params.interviewId) {
      GetInterviewDetails();
    }
  }, [params.interviewId]);

  /**
   * Used to get Interview details by Mock Id /Interview Id
   */
  const GetInterviewDetails = async () => {
    try {
      const result = await db
        .select()
        .from(MockInterview)
        .where(eq(MockInterview.mockId, params.interviewId));

      setInterviewData(result[0]); // Set the interview data here
    } catch (error) {
      console.error("Error fetching interview details:", error);
    }
  };

  return (
    <div className="my-10 ">
      <h2 className="font-bold text-2xl">Let's Get Started</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>
      
      <div className ='flex flex-col my-5 gap-5'>
        <div className = 'flex flex-col  p-5 rounded-lg border gap-5'>
        {/* Conditionally render the job position data once interviewData is loaded */}
        {interviewData ? (
          <>
            <h2 className = 'text-lg'><strong>Job Role/Job Position:</strong> {interviewData.jobPosition}</h2>
            <h2 className = 'text-lg'><strong>Job Description/Tech Stack</strong> {interviewData.jobDesc}</h2>
            <h2 className = 'text-lg'><strong>Years of Experience</strong> {interviewData.jobExperience}</h2>
           

              
              
            {/* Render more data as needed */}
          </>
        ) : (
          <p>Loading interview details...</p> // Loading state
        )}
         </div>
         <div className='p-5  border rounded-lg border-[#f9f0d0] bg-[#f9f0d0]'>
          <h2 className='flex gap-2 items-center text-[#225d75]'><Lightbulb/><span>Information</span></h2>
          <h2 className='mt-3 text-[#225d75]'>{process.env.NEXT_PUBLIC_INFORMATION}</h2>
         </div>
      </div>

      <div>
        {webCamEnabled ? (
          <Webcam
            onUserMedia={() => setWebCamEnabled(true)}
            onUserMediaError={() => setWebCamEnabled(false)}
            mirrored={true}
            style={{
              height: 300,
              width: 300,
            }}
          />
        ) : (
          <>
            <WebcamIcon className="h-72 w-full my-7 p-20 bg-secondary rounded-lg border" />
            <Button  onClick={() => setWebCamEnabled(true)}>
              Enable Web Cam and Microphone
            </Button>
          </>
        )}
      </div>

      </div>
      <div className='flex justify-end items-end'>
        <Link href={'/dashboard/interview/'+params.interviewId+'/start'}>
        <Button>Start Interview</Button>
        </Link>
        
        

      </div>
      
      
    </div>
  );
}

export default Interview;
