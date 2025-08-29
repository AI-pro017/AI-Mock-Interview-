// AI-Mock-Interview-/app/verification-sent/page.jsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, ArrowLeft, Mail, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';

// This tells Next.js not to statically generate this page
export const dynamic = 'force-dynamic';

function VerificationSentContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email';
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    
    try {
      // Simulate API call - replace with actual resend verification endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResendMessage('Verification email resent successfully!');
    } catch (error) {
      setResendMessage('Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 right-40 w-60 h-60 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-6000"></div>
      </div>

      {/* Back to Sign In Button */}
      <Link href="/sign-in" className="absolute top-8 left-8 flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-300 z-20">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Sign In</span>
      </Link>

      {/* Logo */}
      <div className="absolute top-8 right-8 flex items-center space-x-3 z-20">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-25"></div>
        </div>
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            AI Mock Interview
          </h3>
        </div>
      </div>

      <div className="w-full max-w-md p-8 space-y-6 bg-black/40 backdrop-blur-xl text-white rounded-2xl shadow-2xl z-10 border border-white/10">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full px-4 py-2 mb-4 backdrop-blur-sm">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-300 font-medium text-sm">Email Sent Successfully</span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-green-200 to-emerald-300 bg-clip-text text-transparent">
            Check Your Email
          </h1>
        </div>
        
        {/* Email Icon with Animation */}
        <div className="flex justify-center my-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-green-500/30">
              <Mail className="w-12 h-12 text-green-400" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-4 text-center">
          <p className="text-gray-300">
            We've sent a verification link to
          </p>
          <p className="text-lg font-semibold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent break-all">
            {email}
          </p>
          <p className="text-sm text-gray-400">
            Please check your inbox and click the link to activate your account.
          </p>
        </div>
        
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg backdrop-blur-sm">
          <p className="text-sm text-blue-300 text-center">
            💡 Tip: If you don't see the email, check your spam folder. The email may take a few minutes to arrive.
          </p>
        </div>

        {resendMessage && (
          <div className={`p-3 rounded-lg backdrop-blur-sm text-center text-sm ${
            resendMessage.includes('successfully') 
              ? 'bg-green-500/10 border border-green-500/30 text-green-300' 
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}>
            {resendMessage}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => window.location.href = '/sign-in'}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
          >
            Return to Sign In
          </Button>
          
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-gray-400 hover:text-white transition-colors duration-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Resending...' : "Didn't receive the email? Resend verification"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerificationSentPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <VerificationSentContent />
    </Suspense>
  );
}