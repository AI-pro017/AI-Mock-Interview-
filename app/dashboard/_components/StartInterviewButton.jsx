"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import { Play, Sparkles } from 'lucide-react';

function StartInterviewButton() {
    const router = useRouter();

    const handleStart = () => {
        router.push('/dashboard/interview');
    };

    return (
        <div className="relative p-8 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-700/50">
            {/* Strong dark background with a subtle blue animated gradient */}
            <div 
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-blue-900/40 to-slate-900 animate-pan-background" 
                style={{ backgroundSize: '200% 200%' }}
            ></div>

            {/* Dynamic floating orbs with blue and cyan hues */}
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-sky-600/10 rounded-full filter blur-3xl animate-float1 opacity-60"></div>
            <div className="absolute -bottom-24 -right-10 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl animate-float2 opacity-60"></div>

            {/* Content with a clearly animated central icon */}
            <div className="relative z-10 text-center flex flex-col items-center">
                 <div className="p-3 mb-4 bg-slate-700/50 rounded-full border border-white/10 animate-pulse-glow">
                    <Sparkles className="h-6 w-6 text-sky-300" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-3">
                    Ready to Practice?
                </h2>
                <p className="text-slate-300 max-w-lg mx-auto mb-8">
                    Prepare for your next interview with our AI-powered mock sessions that adapt to your responses.
                </p>
                <button
                    onClick={handleStart}
                    className="group relative inline-flex items-center justify-center px-8 py-3 bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm rounded-full text-white font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/20"
                >
                    <Play className="h-5 w-5 mr-3 -ml-1 text-sky-300 group-hover:text-white transition-colors" />
                    Start a New Interview
                </button>
            </div>
        </div>
    );
}

export default StartInterviewButton;
