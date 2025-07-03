"use client"
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

function StartInterviewButton() {
    const router = useRouter();

    const handleClick = () => {
        router.push('/dashboard/interview');
    };

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-blue-500 to-cyan-400 p-14 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center">
            {/* Glassmorphism card effect */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            
            {/* Decorative elements */}
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-pink-500/20 blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl"></div>
            <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-cyan-500/30 blur-2xl"></div>
            
            {/* Animated floating circles */}
            <div className="absolute top-10 left-10 w-6 h-6 rounded-full bg-white/30 animate-pulse"></div>
            <div className="absolute bottom-20 right-1/3 w-4 h-4 rounded-full bg-white/40 animate-ping"></div>
            <div className="absolute top-1/2 left-1/4 w-5 h-5 rounded-full bg-white/30 animate-bounce"></div>
            
            {/* Content */}
            <div className="relative z-10 mb-2">
                <h2 className="text-5xl font-extrabold mb-6 text-white drop-shadow-md">
                    Ready to Practice?
                </h2>
                <p className="text-white/90 mb-12 max-w-md text-xl font-light">
                    Prepare for your next interview with our AI-powered mock sessions that adapt to your responses.
                </p>
                
                {/* Button with hover and active animations */}
                <button 
                    onClick={handleClick} 
                    className="group relative overflow-hidden px-12 py-6 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-2xl shadow-xl border border-white/30 transition-all duration-300 hover:shadow-blue-500/30 hover:shadow-xl"
                >
                    {/* Button shine effect */}
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    
                    <span className="relative flex items-center justify-center gap-4 text-xl font-medium">
                        <span className="flex items-center justify-center bg-white/20 rounded-full w-12 h-12 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <Play className="h-6 w-6 text-white group-hover:text-white transition-colors" fill="white" />
                        </span>
                        Start a New Interview
                    </span>
                </button>
            </div>
        </div>
    );
}

export default StartInterviewButton;
