// AI-Mock-Interview-/app/(auth)/sign-in/[[...sign-in]]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1593349349443-4a7736934c56?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
      }}
    >
      <div className="absolute inset-0 bg-black opacity-60"></div>
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-xl shadow-lg z-10">
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
          className="w-full"
          onClick={handleGoogleSignIn}
        >
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