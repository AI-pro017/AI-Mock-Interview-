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
        console.log("🔍 DEBUGGING AUTH CONFIGURATION");
        
        const providersResponse = await fetch('/api/auth/providers');
        const providers = await providersResponse.json();
        
        console.log("📋 AVAILABLE PROVIDERS:", providers);
        
        if (providers.google) {
          console.log("✅ GOOGLE PROVIDER FOUND:", {
            id: providers.google.id,
            name: providers.google.name,
            type: providers.google.type,
          });
        } else {
          console.log("❌ GOOGLE PROVIDER NOT CONFIGURED");
        }
        
        const csrfResponse = await fetch('/api/auth/csrf');
        const csrfData = await csrfResponse.json();
        console.log("🔒 CSRF STATUS:", csrfData ? "Working" : "Failed");
        
      } catch (error) {
        console.error("🚨 AUTH DEBUGGING ERROR:", error);
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
      console.log("Starting Google Sign-In");
      // Log environment variables from the client side
      console.log("NEXT_PUBLIC_GOOGLE_CLIENT_ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "Not set in client");
      
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
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-green-100"
    >
      <div className="w-full max-w-md p-8 space-y-6 bg-white text-card-foreground rounded-xl shadow-lg z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to continue to your dashboard
          </p>
        </div>
        <form onSubmit={handleCredentialSignIn} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
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
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Sign In with Email
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleGoogleSignIn}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 488 512">
            <path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
          </svg>
          Sign In with Google
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/sign-up" className="text-primary hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}