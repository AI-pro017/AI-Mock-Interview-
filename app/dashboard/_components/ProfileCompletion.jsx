'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { UserCircle } from 'lucide-react';

function ProfileCompletion({ user }) {
  const router = useRouter();
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Fetch the actual profile completion percentage
    fetch('/api/profile-completion')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch profile completion');
      })
      .then(data => {
        setCompletionPercentage(data.completionPercentage || data.completion || 0);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching profile completion:', error);
        setCompletionPercentage(0); // Default to 0% on error
        setIsLoading(false);
      });
  }, []);
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10">
      <div className="flex items-center mb-4">
        <UserCircle className="h-5 w-5 text-slate-400 mr-2" />
        <h2 className="text-xl font-semibold text-white">Profile Completion</h2>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Progress</span>
          <span className="text-sm font-medium text-white">
            {isLoading ? '...' : `${completionPercentage}%`} Complete
          </span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          {isLoading ? (
            <div className="h-full bg-slate-600 rounded-full animate-pulse"></div>
          ) : (
            <div 
              className="h-full bg-sky-400 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          )}
        </div>
      </div>
      
      <p className="text-sm text-slate-400 mb-4">
        A complete profile leads to better interview questions.
      </p>
      
      <button
        onClick={() => router.push('/dashboard/profile')}
        className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
      >
        Complete Profile
      </button>
    </div>
  );
}

export default ProfileCompletion; 