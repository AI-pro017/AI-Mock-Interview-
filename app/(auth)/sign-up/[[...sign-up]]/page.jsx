// AI-Mock-Interview-/app/(auth)/sign-up/[[...sign-up]]/page.jsx  // Corrected path
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaGoogle } from 'react-icons/fa';
import { Bot, Sparkles, ArrowLeft, UserPlus } from 'lucide-react';

export default function Page() {
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
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-4 backdrop-blur-sm">
            <UserPlus className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 font-medium text-sm">Join Us Today</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
            Create Your Account
          </h1>
          <p className="text-gray-400 mt-2">
            Start your journey to interview success
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
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm"
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
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm"
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
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold disabled:opacity-50 shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
        >
          <FaGoogle className="text-red-500" />
          Sign Up with Google
        </Button>
        <div className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}