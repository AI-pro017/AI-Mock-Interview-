'use client';

import React from 'react';
import InterviewList from '../_components/InterviewList';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function InterviewHistoryClient({ user, interviews }) {
  return (
    <div className='p-10'>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Interview History</h1>
      </div>
      
      <p className="text-gray-500 mb-8">
        View all your previous interviews and their feedback.
      </p>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <InterviewList interviews={interviews} />
      </div>
    </div>
  )
}

export default InterviewHistoryClient; 