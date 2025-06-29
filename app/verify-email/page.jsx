// AI-Mock-Interview-/app/verify-email/page.jsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
          throw new Error(data.message || 'Failed to verify email.');
        }
        
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };

    verifyToken();
  }, [token]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
  return (
          <>
            <h1 className="text-2xl font-bold">Verifying your email...</h1>
            <p className="mt-2 text-muted-foreground">Please wait a moment.</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </>
        );
      case 'success':
        return (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-500">Email Verified!</h1>
            <p className="mt-2 text-muted-foreground">Your account has been successfully activated.</p>
            <Link href="/sign-in" passHref>
                <Button className="w-full mt-6">Go to Sign In</Button>
          </Link>
          </>
        );
      case 'error':
        return (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-destructive">Verification Failed</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Link href="/sign-up" passHref>
                <Button className="w-full mt-6">Go back to Sign Up</Button>
          </Link>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-xl shadow-lg z-10 text-center">
        {renderContent()}
      </div>
    </div>
  );
}

// The page must be wrapped in Suspense because useSearchParams() is a Client Component hook
export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}