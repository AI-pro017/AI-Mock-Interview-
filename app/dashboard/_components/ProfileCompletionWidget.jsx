"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileCompletionWidget() {
  const [completion, setCompletion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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

  const handleClick = () => {
    router.push('/dashboard/profile');
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10 text-white">
      <h3 className="text-xl font-semibold mb-2">Profile Completion</h3>
      <p className="text-slate-400 mb-4">
        A complete profile leads to better interview questions.
      </p>
      
      {isLoading ? (
        <div className="animate-pulse h-2 bg-slate-700 rounded-full w-full mb-2"></div>
      ) : (
        <>
          <div className="bg-slate-700 h-2 rounded-full w-full mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${completion}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-300 mb-4">{completion}% Complete</p>
        </>
      )}
      
      <button 
        onClick={handleClick}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
      >
        Complete Profile
      </button>
    </div>
  );
} 