"use client";
import { db } from '@/utils/db';
import { MockInterview } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import React, { useEffect, useState } from 'react';
import QuestionsSection from './_components/QuestionsSection';
import RecordAnswerSection from './_components/RecordAnswerSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function StartInterview({ params }) {
    // State to hold the interview data and the list of questions
    const [interviewData, setInterviewData] = useState(null);  // Initialize as null
    const [mockInterviewQuestion, setMockInterviewQuestion] = useState([]);  // Initialize as an empty array
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);  // To track the current question

    //  interview details when the component is mounted
    useEffect(() => {
        GetInterviewDetails();
    }, []);

    // Function to fetch interview data from the database
    const GetInterviewDetails = async () => {
        try {
            const result = await db
                .select()
                .from(MockInterview)
                .where(eq(MockInterview.mockId, params.interviewId));

            // Ensure there is a valid result
            if (result.length > 0) {
                // Set the interview data
                setInterviewData(result[0]);

                // Parse and set the mock interview questions
                const jsonMockResp = JSON.parse(result[0].jsonMockResp);
                console.log(jsonMockResp);

                // Update the state with the mock interview questions
                setMockInterviewQuestion(jsonMockResp);
            } else {
                console.error("No interview data found for the given ID");
            }
        } catch (error) {
            console.error("Error fetching interview data:", error);
        }
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Question Section */}
                {mockInterviewQuestion.length > 0 && (
                    <QuestionsSection 
                        mockInterviewQuestion={mockInterviewQuestion}
                        activeQuestionIndex={activeQuestionIndex}
                    />
                )}
                
                {/* Video / Audio Recording Section */}
                {interviewData && (
                    <RecordAnswerSection
                        mockInterviewQuestion={mockInterviewQuestion}
                        activeQuestionIndex={activeQuestionIndex}
                        interviewData={interviewData}
                    />
                )}
            </div>
            <div className = 'flex justify-end gap-6'>
                {activeQuestionIndex>0 && <Button onClick={()=>setActiveQuestionIndex(activeQuestionIndex-1)}>Previous Question</Button>}
                {activeQuestionIndex!=mockInterviewQuestion?.length-1&& <Button onClick={()=>setActiveQuestionIndex(activeQuestionIndex+1)}>Next Question</Button>}
                {activeQuestionIndex==mockInterviewQuestion?.length-1&& <Link href={'/dashboard/interview/'+interviewData?.mockId+"/feedback"}><Button>End</Button></Link>}
                
                
            </div>
        </div>
    );
}

export default StartInterview;
