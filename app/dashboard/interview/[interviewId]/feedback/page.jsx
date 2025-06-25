//points
"use client"
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
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

function Feedback({ params }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);  // New state for total points
  const router = useRouter();

  useEffect(() => {
    GetFeedback();
  }, []);

  const GetFeedback = async () => {
    const result = await db.select()
      .from(UserAnswer)
      .where(eq(UserAnswer.mockIdRef, params.interviewId))
      .orderBy(UserAnswer.id);

    console.log(result);
    setFeedbackList(result);

    // Calculate total points
    const total = result.reduce((acc, item) => acc + (item.points || 0), 0);  // Sum up points
    setTotalPoints(total);  // Set total points
  };

  return (
    <div className='p-10'>
      {feedbackList?.length === 0 ?
        <h2 className='font-bold text-xl text-gray-500'>No Interview Feedback Record Found</h2>
        :
        <>
          <h2 className='text-3xl font-bold text-[#3f7990]'>Congratulations!</h2>
          <h2 className='font-bold text-2xl text-[#cfad33]'>Here is your interview feedback</h2>
          <h2 className='text-sm text-gray-500'>Find below interview questions with correct answers, your answer, feedback for improvement, and points earned.</h2>

          {/* Display the total points
          <div className='p-4 my-5 bg-[#f0f4f8] text-[#305f72] border rounded-lg'>
            <h2 className='text-lg font-semibold'>Total Points Earned: {totalPoints}</h2> 
          </div> */}

          {feedbackList && feedbackList.map((item, index) => (
            <Collapsible key={index} className='mt-7'>
              <CollapsibleTrigger className='p-2 bg-secondary rounded-lg flex justify-between my-2 text-left gap-7 w-full'>
                {item.question} <ChevronsUpDown className='h-5 w-5' />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className='flex flex-col gap-2'>
                  <h2 className='p-2 border rounded-lg bg-[#fff7db] text-sm text-[#305f72]'><strong>Your Answer: </strong>{item.userAns}</h2>
                  <h2 className='p-2 border rounded-lg bg-[#3783a1] text-sm text-[#fff7db]'><strong>Correct Answer: </strong>{item.correctAns}</h2>
                  <h2 className='p-2 border rounded-lg bg-blue-50 text-sm text-black'><strong>Feedback: </strong>{item.feedback}</h2>
                  {/* <h2 className='p-2 border rounded-lg bg-green-50 text-sm text-black'><strong>Points Earned: </strong>{item.points || 0}</h2>  */}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </>
      }
      <Button onClick={() => router.replace('/dashboard')}>Go Home</Button>
    </div>
  );
}

export default Feedback;
