'use client';

import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from 'next/link';

export default function ProfileCompletion({ user }) {
  const calculateCompletion = () => {
    if (!user) return 0;

    const fields = [
      user.name,
      user.image, // Avatar
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
    <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Profile Completion</h2>
      <div className="space-y-2 flex-grow">
        <Progress value={completionPercentage} />
        <p className="text-sm text-center text-gray-500">
          {completionPercentage}% Complete
        </p>
      </div>
      <p className="text-xs text-center text-gray-400 mt-4">
        A complete profile leads to better interview questions.
      </p>
       {completionPercentage < 100 && (
        <Link href="/dashboard/profile" className="mt-4 text-center">
            <button className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                Complete Profile
            </button>
        </Link>
      )}
    </div>
  );
} 