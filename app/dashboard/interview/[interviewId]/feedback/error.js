'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function FeedbackError({ error, reset }) {
  const router = useRouter();
  
  return (
    <div className="p-10 flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold text-red-500">Sorry, we couldn't generate your feedback report at this time.</h2>
      <p className="text-gray-500 mt-4 max-w-md text-center">
        {error?.message || "There was a problem retrieving or generating your interview feedback."}
      </p>
      <div className="flex gap-4 mt-8">
        <Button onClick={() => reset()} variant="outline">
          Try again
        </Button>
        <Button onClick={() => router.replace('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
} 