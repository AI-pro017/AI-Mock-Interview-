"use client"
import React from 'react'
import InterviewItemCard from './InterviewItemCard';
import Link from 'next/link';
import { ChevronRight, History } from 'lucide-react';

function InterviewList({ interviews = [], limit = null }) {
  // Apply limit if specified
  const displayedInterviews = limit ? interviews.slice(0, limit) : interviews;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <History className="h-5 w-5 text-slate-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">Recent Mock Interviews</h2>
        </div>
        {interviews.length > 0 && limit && (
          <Link 
            href="/dashboard/interview-history"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            View all
          </Link>
        )}
      </div>
      
      {displayedInterviews && displayedInterviews.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {displayedInterviews.map((interview, index) => (
            <InterviewItemCard 
              interview={interview}
              key={interview.id || index}
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-lg p-8 text-center">
          <p className="text-slate-300 mb-2">No mock interviews found yet</p>
          <p className="text-sm text-slate-500">Start your first mock interview to see your history</p>
        </div>
      )}
      
      {limit && interviews.length > limit && (
        <div className="mt-6 text-center">
          <Link 
            href="/dashboard/interview-history" 
            className="inline-flex items-center px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-full text-sm font-medium group transition-all"
          >
            View all {interviews.length} mock interviews
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default InterviewList