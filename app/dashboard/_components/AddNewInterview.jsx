"use client"
import React, { useState, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { chatSession } from '@/utils/GeminiAIModal';
import { LoaderCircle, PlusSquare } from 'lucide-react';
import { MockInterview } from '@/utils/schema';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { db } from '@/utils/db';
import { useRouter } from 'next/navigation';

function AddNewInterview() {
    const [openDialog, setOpenDialog] = useState(false);
    const [jobPosition, setJobPosition] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [jobExperience, setJobExperience] = useState('');
    const [loading, setLoading] = useState(false);
    const [jsonResponse, setJsonResponse] = useState([]);
    const router = useRouter();

    const [currentUserEmail, setCurrentUserEmail] = useState('temp_user@example.com');

    useEffect(() => {
        console.log("AddNewInterview mounted. Current placeholder user email:", currentUserEmail);
    }, []);

    const onSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();
        console.log(jobPosition, jobDesc, jobExperience);

        const InputPrompt = "Job position: " + jobPosition + ", Job Description: " + jobDesc + ", Years of Experience: " + jobExperience + ". Based on this information, provide " + process.env.NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT + " interview questions along with answers in JSON format. The response should include 'question' and 'answer' fields in the JSON.";

        try {
            const result = await chatSession.sendMessage(InputPrompt);
            const MockJsonResp = (result.response.text()).replace('```json', '').replace('```', '');

            console.log(JSON.parse(MockJsonResp));
            setJsonResponse(MockJsonResp);

            if (MockJsonResp) {
                const resp = await db.insert(MockInterview)
                    .values({
                        mockId: uuidv4(),
                        jsonMockResp: MockJsonResp,
                        jobPosition: jobPosition,
                        jobDesc: jobDesc,
                        jobExperience: jobExperience,
                        createdBy: currentUserEmail,
                        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                    })
                    .returning({ mockId: MockInterview.mockId });

                console.log("Inserted ID:", resp);
                if (resp && resp.length > 0) {
                    setOpenDialog(false);
                    router.push('/dashboard/interview/' + resp[0]?.mockId);
                } else {
                    console.error("Failed to insert interview or get ID back.");
                }
            } else {
                console.error("ERROR: Mock JSON response was empty.");
            }
        } catch (error) {
            console.error("Error in onSubmit:", error);
        } finally {
            setLoading(false);
        }
    }

    const onStartNewInterview = () => {
        router.push('/dashboard/interview'); 
    };

    return (
        <div className="p-8 bg-gradient-to-br from-primary to-blue-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col items-center text-center">
                <PlusSquare className="h-16 w-16 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Start a New Mock Interview</h2>
                <p className="mb-6 max-w-sm">
                    Configure a new interview based on your target role and get instant AI-powered feedback.
                </p>
                <button
                    onClick={onStartNewInterview}
                    className="bg-white text-primary font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-100 transition-colors duration-300"
                >
                    Let's Go
                </button>
            </div>
        </div>
    );
}

export default AddNewInterview;
