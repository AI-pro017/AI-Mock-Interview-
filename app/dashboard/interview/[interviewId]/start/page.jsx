"use client";
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import InterviewSession from './_components/InterviewSession';
import CameraSelection from './_components/CameraSelection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function InterviewStartPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [useCameraInInterview, setUseCameraInInterview] = useState(false);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);

    useEffect(() => {
        const webcamEnabled = searchParams.get('webcam') === 'true';
        if (webcamEnabled) {
            setUseCameraInInterview(true);
        }

        async function fetchInterview() {
            try {
                const response = await fetch(`/api/interview?id=${params.interviewId}`);
                if (!response.ok) throw new Error('Failed to fetch interview');
                const data = await response.json();
                setInterview(data);
            } catch (error) {
                console.error("Error loading interview:", error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchInterview();
    }, [params.interviewId, searchParams]);

    const handleCameraToggle = (enabled) => {
        setUseCameraInInterview(enabled);
    };

    const handleStartInterview = () => {
        setIsSetupComplete(true);
    };

    if (loading) {
        return <div className="container mx-auto p-5">Loading interview data...</div>;
    }

    if (!isSetupComplete) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-900 text-white">
                <div className="container mx-auto flex-1 p-5">
                    <h1 className="text-2xl font-bold mb-6">Interview Setup</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Card className="p-6 bg-gray-800 border-gray-700">
                                <h2 className="text-xl font-bold mb-4">Interview Details</h2>
                                {interview && (
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-semibold">Position:</span> {interview.jobPosition}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Experience Level:</span> {interview.jobExperience} years
                                        </div>
                                        <div>
                                            <span className="font-semibold">Interview Style:</span> {interview.interviewStyle}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Focus:</span> {interview.focus}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Duration:</span> {interview.duration} minutes
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                        <CameraSelection 
                            initialEnabled={useCameraInInterview} 
                            onCameraToggle={handleCameraToggle} 
                        />
                    </div>
                </div>
                <div className="sticky bottom-0 w-full border-t border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/80">
                    <div className="container mx-auto p-4 flex justify-center">
                        <Button 
                            size="lg" 
                            onClick={handleStartInterview}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Start Interview
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-5 bg-gray-900 text-white">
            {interview && (
                <InterviewSession 
                    interview={interview} 
                    useCameraInInterview={useCameraInInterview}
                />
            )}
        </div>
    );
}
