'use client';

import { Progress } from "@/components/ui/progress";
import Link from 'next/link';

export default function ProfileCompletion({ user }) {
  const calculateCompletion = () => {
    if (!user) return 0;

    const fields = [
      user.name,
      user.image,
      user.experienceLevel,
      user.targetRoles,
      user.resumeUrl,
      user.timezone
    ];

    const filledFields = fields.filter(field => field && field.toString().trim() !== '').length;
    const totalFields = fields.length;
    
    if (totalFields === 0) return 100;

    const percentage = Math.round((filledFields / totalFields) * 100);
    return percentage;
  };

  const completionPercentage = calculateCompletion();

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Profile Completion</h2>
      
      <div className="mb-2 flex justify-between items-center">
        <span className="text-sm text-gray-500">Progress</span>
        <span className="text-sm font-medium text-gray-700">{completionPercentage}% Complete</span>
      </div>
      
      <div className="h-2 w-full bg-gray-200 rounded-full mb-4">
        <div 
          className="h-2 bg-blue-600 rounded-full" 
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        A complete profile leads to better interview questions.
      </p>
      
      {completionPercentage < 100 && (
        <Link href="/dashboard/profile">
          <button className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Complete Profile
          </button>
        </Link>
      )}
    </div>
  );
} 