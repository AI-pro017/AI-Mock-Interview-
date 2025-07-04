"use client";

import { useState, useEffect } from 'react';

export default function ProfileCompletion() {
    const [completion, setCompletion] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        // Fetch the profile completion on mount
        fetch('/api/profile-completion')
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to fetch profile completion');
            })
            .then(data => {
                setCompletion(data.completion || 0);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Error fetching profile completion:', error);
                setIsLoading(false);
            });
    }, []);

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (completion / 100) * circumference;

    return (
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10 text-white">
            <h3 className="text-xl font-semibold mb-2">Profile Completion</h3>
            <p className="text-slate-400 mb-6">
                Complete your profile to get better AI-powered insights.
            </p>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-40">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <div className="relative h-40 w-40">
                        <svg className="h-full w-full" viewBox="0 0 140 140">
                            <circle
                                className="text-slate-700"
                                strokeWidth="10"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="70"
                                cy="70"
                            />
                            <circle
                                className="text-blue-500"
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="70"
                                cy="70"
                                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                                transform="rotate(-90 70 70)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold text-white">{completion}%</span>
                        </div>
                    </div>
                    <p className="mt-4 text-slate-400 text-center">
                        {completion < 100 
                            ? "Keep going! The more complete your profile, the better your interview preparation."
                            : "Great job! Your profile is complete."}
                    </p>
                </div>
            )}
        </div>
    );
} 