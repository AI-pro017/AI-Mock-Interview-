"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Award, BookOpen, ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';

export default function InterviewHistory() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/interview-history');
        if (!response.ok) {
          throw new Error('Failed to fetch interview history');
        }
        const data = await response.json();
        
        // Sort interviews by createdAt in descending order (newest first)
        const sortedInterviews = [...data].sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        setInterviews(sortedInterviews);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleViewFeedback = (interviewId) => {
    router.push(`/dashboard/interview/${interviewId}/feedback`);
  };
  
  if (loading) {
    return (
      <div className="p-10 bg-[#0d1526] text-white min-h-screen">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Mock Interview History</h1>
        </div>
        <p className="text-gray-300">Loading your past interviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 bg-[#0d1526] text-white min-h-screen">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Mock Interview History</h1>
        </div>
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-10 bg-[#0d1526] text-white min-h-screen">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Mock Interview History</h1>
      </div>
      <p className="text-gray-400 mb-8">View all your previous mock interviews and their feedback.</p>
      
      {/* Replace white container with dark container */}
      <div className="bg-[#111827] p-6 rounded-xl shadow-none">
        <div className="flex items-center mb-6">
          <History className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-xl font-semibold text-white">Recent Mock Interviews</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {interviews.length > 0 ? (
            interviews.map((interview) => (
              <div 
                key={interview.id} 
                className="bg-[#1a2234] p-6 rounded-lg border border-[#2c3648] hover:border-blue-500 transition-all"
              >
                <h3 className="text-xl font-semibold text-white mb-1">{interview.jobPosition}</h3>
                
                <div className="flex items-center text-gray-400 mb-3">
                  <span className="text-sm">
                    {new Date(interview.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-300">
                    <Clock className="h-4 w-4 mr-2 text-blue-400" />
                    <span className="text-sm">Duration: {interview.duration || 15} min</span>
                  </div>
                  
                  <div className="flex items-center text-gray-300">
                    {interview.report && interview.report.overallScore ? (
                      <>
                        <Award className="h-4 w-4 mr-2 text-green-400" />
                        <span className="text-sm">Score: {interview.report.overallScore}/100</span>
                      </>
                    ) : (
                      <>
                        <Award className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm text-gray-500">No Score</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center text-gray-300">
                    <BookOpen className="h-4 w-4 mr-2 text-purple-400" />
                    <span className="text-sm">Focus: {interview.focus || 'Behavioral'}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleViewFeedback(interview.mockId)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Feedback
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-[#1a2234] p-8 rounded-lg border border-[#2c3648] text-center">
              <p className="text-gray-300">You have not completed any interviews yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 