// AI-Mock-Interview-/app/(auth)/sign-in/[[...sign-in]]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LucideGithub, Bot, Sparkles, ArrowLeft } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

export default function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    const debugAuth = async () => {
      try {

        const providersResponse = await fetch('/api/auth/providers');
        const providers = await providersResponse.json();

        const csrfResponse = await fetch('/api/auth/csrf');
        const csrfData = await csrfResponse.json();

      } catch (error) {
        console.error("AUTH DEBUGGING ERROR:", error);
      }
    };
    
    debugAuth();
  }, []);

  const handleCredentialSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // First, check if user is disabled before attempting sign-in
      const userCheckResponse = await fetch('/api/auth/check-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (userCheckResponse.ok) {
        const userStatus = await userCheckResponse.json();
        if (userStatus.disabled) {
          setError('Your account has been disabled. Please contact support.');
          setIsLoading(false);
          return;
        }
      }

      // Proceed with normal sign-in
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    try {
      signIn('google', { 
        callbackUrl,
        redirect: true
      }).catch(error => {
        console.error("Google Sign-In Error:", error);
      });
    } catch (error) {
      console.error("Failed to initiate Google Sign-In:", error);
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

      {/* Back to Home Button */}
      <Link href="/" className="absolute top-8 left-8 flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-300 z-20">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Home</span>
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
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full px-4 py-2 mb-4 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 font-medium text-sm">Welcome Back</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
            Sign In to Your Account
          </h1>
          <p className="text-gray-400 mt-2">
            Continue your interview preparation journey
          </p>
        </div>
        <form onSubmit={handleCredentialSignIn} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-400">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-gray-400">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold disabled:opacity-50 shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
          >
            {isLoading ? 'Signing In...' : 'Sign In with Email'}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black/40 backdrop-blur-sm px-2 text-gray-400">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2 bg-white/10 border-white/20 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-300"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <FaGoogle className="text-red-500" />
          Sign In with Google
        </Button>
        <div className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link href="/sign-up" className="text-blue-500 hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}