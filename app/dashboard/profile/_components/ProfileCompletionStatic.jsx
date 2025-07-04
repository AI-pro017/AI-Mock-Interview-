"use client";

export default function ProfileCompletionStatic({ percentage }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10 text-white">
      <h3 className="text-xl font-semibold mb-2">Profile Completion</h3>
      <p className="text-slate-400 mb-6">
        Complete your profile to get better AI-powered insights.
      </p>
      
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
            <span className="text-3xl font-bold text-white">{percentage}%</span>
          </div>
        </div>
        <p className="mt-4 text-slate-400 text-center">
          {percentage < 100 
            ? "Keep going! The more complete your profile, the better your interview preparation."
            : "Great job! Your profile is complete."}
        </p>
      </div>
    </div>
  );
} 