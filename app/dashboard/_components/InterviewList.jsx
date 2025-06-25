"use client"
import { db } from '@/utils/db';
import { MockInterview } from '@/utils/schema';
import { desc, eq } from 'drizzle-orm';
import React, { useEffect, useState } from 'react'
import InterviewItemCard from './InterviewItemCard';

function InterviewList() {
    const [interviewList, setInterviewList] = useState([]);
    
    const [currentUserEmail, setCurrentUserEmail] = useState(null);

    useEffect(() => {
        const fetchedUserEmail = 'temp_user@example.com'; 
        setCurrentUserEmail(fetchedUserEmail);
        console.log("InterviewList: Current placeholder user email:", fetchedUserEmail);
    }, []);

    useEffect(() => {
        if (currentUserEmail) {
            GetInterviewList();
        }
    }, [currentUserEmail]);

    const GetInterviewList = async () => {
        if (!currentUserEmail) {
            console.log("No current user email available to fetch interviews.");
            setInterviewList([]);
            return;
        }
        console.log("Fetching interviews for:", currentUserEmail);
        try {
            const result = await db.select()
                .from(MockInterview)
                .where(eq(MockInterview.createdBy, currentUserEmail))
                .orderBy(desc(MockInterview.id));
            
            console.log("Fetched interviews:", result);
            setInterviewList(result);
        } catch (error) {
            console.error("Error fetching interview list:", error);
            setInterviewList([]);
        }
    }

  return (
    <div>
        <h2 className='font-medium text-xl mt-10 mb-5'>
            History of previous interviews
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-3'>
            {interviewList && interviewList.length > 0 ? (
                interviewList.map((interview, index) => (
                    <InterviewItemCard 
                        interview={interview}
                        key={interview.id || index}
                    />
                ))
            ) : (
                <p className="text-gray-500">No interviews found yet, or still loading...</p>
            )}
        </div>
    </div>
  )
}

export default InterviewList