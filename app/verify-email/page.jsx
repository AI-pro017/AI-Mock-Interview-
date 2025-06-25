// AI-Mock-Interview-/app/verify-email/page.jsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token found. Please check the link and try again.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify email.');
        }

        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fbefe5] px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl text-center">
        {status === 'verifying' && (
          <div>
            <h1 className="text-2xl font-bold text-[#2c5f73]">Verifying your email...</h1>
            <p className="mt-2 text-gray-600">Please wait a moment.</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c5f73]"></div>
            </div>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <h1 className="text-2xl font-bold text-green-600">Email Verified!</h1>
            <p className="mt-2 text-gray-600">Your account has been successfully activated.</p>
            <Link href="/sign-in" className="inline-block mt-6 px-6 py-2 text-sm font-medium text-white bg-[#2c5f73] rounded-md hover:bg-[#234d5f]">
              Go to Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h1 className="text-2xl font-bold text-red-600">Verification Failed</h1>
            <p className="mt-2 text-gray-600">{error}</p>
             <Link href="/sign-up" className="inline-block mt-6 px-6 py-2 text-sm font-medium text-white bg-[#2c5f73] rounded-md hover:bg-[#234d5f]">
              Go back to Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// The page must be wrapped in Suspense because useSearchParams() is a Client Component hook
export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    )
}