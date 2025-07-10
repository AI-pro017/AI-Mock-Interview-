// AI-Mock-Interview-/app/(auth)/sign-in/[[...sign-in]]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LucideGithub } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

export default function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    <div className="flex items-center justify-center min-h-screen bg-[#0d1526]">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#111827] text-white rounded-2xl shadow-2xl z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-gray-400 mt-2">
            Sign in to continue to your dashboard
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
              className="bg-[#1a2234] border-[#2c3648] text-white focus:ring-blue-500 focus:border-blue-500"
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
              className="bg-[#1a2234] border-[#2c3648] text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
            Sign In with Email
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#111827] px-2 text-gray-400">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2 bg-[#1a2234] border-[#2c3648] hover:bg-[#2c3648] text-white"
          onClick={handleGoogleSignIn}
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