'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, ArrowLeft, Mail, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessage('If an account with that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
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
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-4 backdrop-blur-sm">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-medium text-sm">Password Recovery</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-amber-200 to-orange-300 bg-clip-text text-transparent">
            Forgot Your Password?
          </h1>
          <p className="text-gray-400 mt-2">
            No worries! Enter your email and we'll send you reset instructions
          </p>
        </div>

        {message && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg backdrop-blur-sm flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{message}</span>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg backdrop-blur-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email" className="text-gray-400 flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Email Address</span>
            </Label>
            <Input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-amber-500 focus:border-amber-500 backdrop-blur-sm mt-2"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold disabled:opacity-50 shadow-lg hover:shadow-amber-500/25 transition-all duration-300"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-400">
              Remember your password?{' '}
              <Link href="/sign-in" className="text-amber-400 hover:text-amber-300 hover:underline transition-colors">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-gray-400">
              Don't have an account?{' '}
              <Link href="/sign-up" className="text-amber-400 hover:text-amber-300 hover:underline transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}