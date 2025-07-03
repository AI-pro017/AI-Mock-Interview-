"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Award, BookOpen } from 'lucide-react';

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
      <div className="p-10 bg-gray-900 text-white min-h-screen">
        <h2 className="font-bold text-3xl mb-4">Interview History</h2>
        <p className="text-gray-300">Loading your past interviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 bg-gray-900 text-white min-h-screen">
        <h2 className="font-bold text-3xl mb-4">Interview History</h2>
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-10 bg-gray-900 text-white min-h-screen">
      <h2 className="font-bold text-3xl mb-4">Interview History</h2>
      <p className="text-gray-300 mb-8">Review your past interviews and see your feedback.</p>
      
      <div className="space-y-6">
        {interviews.length > 0 ? (
          interviews.map((interview) => (
            <div key={interview.id} className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 hover:border-blue-500 transition-all">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{interview.jobPosition}</h3>
                  <p className="text-gray-400 mt-1">
                    Conducted on: {new Date(interview.createdAt).toLocaleDateString()}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center text-gray-300">
                      <Clock className="h-4 w-4 mr-2 text-blue-400" />
                      <span>Duration: {interview.duration || 15} minutes</span>
                    </div>
                    
                    {interview.report ? (
                      <div className="flex items-center text-gray-300">
                        <Award className="h-4 w-4 mr-2 text-green-400" />
                        <span>Score: {interview.report.overallScore || 'N/A'}/100</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400">
                        <Award className="h-4 w-4 mr-2" />
                        <span>Score: Pending</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-gray-300">
                      <BookOpen className="h-4 w-4 mr-2 text-purple-400" />
                      <span>Focus: {interview.focus || 'Balanced'}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleViewFeedback(interview.mockId)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                >
                  View Feedback
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
            <p className="text-gray-300">You have not completed any interviews yet.</p>
          </div>
        )}
      </div>
    </div>
  );
} 