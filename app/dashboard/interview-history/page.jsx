"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
        setInterviews(data);
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
      <div className="p-10">
        <h2 className="font-bold text-3xl mb-4">Interview History</h2>
        <p>Loading your past interviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <h2 className="font-bold text-3xl mb-4">Interview History</h2>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-10">
      <h2 className="font-bold text-3xl mb-4">Interview History</h2>
      <p className="text-gray-500 mb-8">Review your past interviews and see your feedback.</p>
      
      <div className="space-y-6">
        {interviews.length > 0 ? (
          interviews.map((interview) => (
            <div key={interview.id} className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">{interview.jobPosition}</h3>
                <p className="text-gray-600">
                  Conducted on: {new Date(interview.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleViewFeedback(interview.mockId)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Feedback
              </button>
            </div>
          ))
        ) : (
          <p>You have not completed any interviews yet.</p>
        )}
      </div>
    </div>
  );
} 