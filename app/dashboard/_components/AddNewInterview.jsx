"use client"
import React, { useState } from 'react';
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
import { useSession } from 'next-auth/react';

function AddNewInterview() {
    const [jobPosition, setJobPosition] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [jobExperience, setJobExperience] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { data: session } = useSession();

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const InputPrompt = `Job position: ${jobPosition}, Job Description: ${jobDesc}, Years of Experience: ${jobExperience}. Based on this, provide ${process.env.NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT} interview questions with answers in JSON format. The response must have 'question' and 'answer' fields.`;

        try {
            const result = await chatSession.sendMessage(InputPrompt);
            const MockJsonResp = (result.response.text()).replace(/```json|```/g, '');

            if (MockJsonResp) {
                const resp = await db.insert(MockInterview)
                    .values({
                        mockId: uuidv4(),
                        jsonMockResp: MockJsonResp,
                        jobPosition: jobPosition,
                        jobDesc: jobDesc,
                        jobExperience: jobExperience,
                        createdBy: session?.user?.email || 'anonymous',
                        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                    })
                    .returning({ mockId: MockInterview.mockId });

                if (resp && resp.length > 0) {
                    router.push(`/dashboard/interview/${resp[0].mockId}`);
                }
            }
        } catch (error) {
            console.error("Error creating interview:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 md:p-8 border rounded-lg bg-white shadow-sm">
            <h2 className="text-2xl font-bold mb-1 text-gray-800">Start a New Interview</h2>
            <p className="text-gray-500 mb-6">Configure a new interview to match your target job.</p>
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Role / Position</label>
                    <Input placeholder="E.g., Software Engineer" required onChange={(e) => setJobPosition(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Description / Tech Stack</label>
                    <Textarea placeholder="E.g., React, Node.js, Next.js" required onChange={(e) => setJobDesc(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                    <Input type="number" placeholder="E.g., 5" required onChange={(e) => setJobExperience(e.target.value)} />
                </div>
                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading}>
                        {loading ? <LoaderCircle className="animate-spin" /> : "Start Interview"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default AddNewInterview;
