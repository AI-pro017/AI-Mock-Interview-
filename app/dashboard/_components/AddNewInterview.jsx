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
import { LoaderCircle } from 'lucide-react';
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

    return (
        <div>
            <div className='p-10 border rounded-lg bg-secondary hover:scale-105 hover:shadow-md cursor-pointer transition-all'
                onClick={() => setOpenDialog(true)}>
                <h2 className='text-lg text-center'>+ Add New</h2>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-2xl bg-white">
                    <DialogHeader>
                        <DialogTitle className='text-2xl'>Create New Mock Interview</DialogTitle>
                        <DialogDescription asChild>
                            <form onSubmit={onSubmit}>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800 mb-1">Tell us more about your job interview</h2>
                                    <p className="text-sm text-gray-600 mb-4">Add details about your job position/role, job description, and years of experience.</p>
                                    
                                    <div className='mt-7 my-3'>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Role/Job Position</label>
                                        <Input placeholder="Ex. Full Stack Developer" className="text-gray-700" required
                                            onChange={(event) => setJobPosition(event.target.value)} />
                                    </div>

                                    <div className='my-3'>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Description / Required Skills</label>
                                        <Textarea placeholder="Ex. React, Angular, NodeJs, MySql, etc." required
                                            onChange={(event) => setJobDesc(event.target.value)} />
                                    </div>

                                    <div className='my-3'>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                                        <Input placeholder="Ex. 5" type="number" max="50" min="0" required
                                            onChange={(event) => setJobExperience(event.target.value)} />
                                    </div>
                                </div>

                                <div className='flex gap-5 justify-end mt-6'>
                                    <Button type="button" variant="ghost" onClick={() => setOpenDialog(false)}>Cancel</Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <LoaderCircle className='animate-spin mr-2' /> Generating from AI...
                                            </>
                                        ) : 'Start Interview'}
                                    </Button>
                                </div>
                            </form>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default AddNewInterview;
