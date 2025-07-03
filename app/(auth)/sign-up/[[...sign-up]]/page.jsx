// AI-Mock-Interview-/app/(auth)/sign-up/page.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaGoogle } from 'react-icons/fa';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleCredentialSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Automatically sign in the user after successful registration
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        // If auto-login fails, redirect to a page asking them to verify email
        router.push(`/verification-sent?email=${encodeURIComponent(email)}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1526]">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#111827] text-white rounded-2xl shadow-2xl z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
          <p className="text-gray-400 mt-2">
            Start your journey with a new account
          </p>
        </div>
        <form onSubmit={handleCredentialSignUp} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-400">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-[#1a2234] border-[#2c3648] text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
            <Label htmlFor="password" className="text-gray-400">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-[#1a2234] border-[#2c3648] text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
          Sign Up with Google
        </Button>
        <div className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-blue-500 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}