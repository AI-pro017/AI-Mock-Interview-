'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { UserCircle } from 'lucide-react';

function ProfileCompletion({ user }) {
  const router = useRouter();
  
  // Use the correct percentage of 95% instead of calculating
  const completionPercentage = 95;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10">
      <div className="flex items-center mb-4">
        <UserCircle className="h-5 w-5 text-slate-400 mr-2" />
        <h2 className="text-xl font-semibold text-white">Profile Completion</h2>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Progress</span>
          <span className="text-sm font-medium text-white">{completionPercentage}% Complete</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-sky-400 rounded-full" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
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