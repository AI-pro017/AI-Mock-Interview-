// AI-Mock-Interview-/app/verification-sent/page.jsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

// This tells Next.js not to statically generate this page
export const dynamic = 'force-dynamic';

function VerificationSentContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-6">
          Verification Email Sent
        </h1>
        
        <div className="mb-8 text-6xl">✉️</div>
        
        <p className="text-lg mb-6">
          We've sent a verification link to <strong>{email}</strong>.
          Please check your inbox and click the link to activate your account.
        </p>
        
        <p className="mb-8 text-sm">
          If you don't see the email, check your spam folder. The email may take a few minutes to arrive.
        </p>

        <Link href="/sign-in">
          <button className="w-full font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-150">
            Return to Sign In
          </button>
        </Link>
        
        <p className="text-sm mt-6">
          Didn't receive the email? <a href="#" className="hover:underline">Resend verification</a>
        </p>
      </div>
    </div>
  );
}

export default function VerificationSentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <VerificationSentContent />
    </Suspense>
  );
}