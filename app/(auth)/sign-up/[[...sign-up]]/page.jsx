// AI-Mock-Interview-/app/(auth)/sign-up/page.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }
      
      setSuccess(true);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <section className="bg-[#fbefe5]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-12">
        <section className="relative flex h-32 items-end bg-gray-900 lg:col-span-5 lg:h-full xl:col-span-6">
          <img
            alt=""
            src="https://www.barraiser.com/wp-content/uploads/2023/11/what-are-ai-interviews-everything-you-need-to-know.jpg"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />

          <div className="hidden lg:relative lg:block lg:p-12">
            <a className="block text-white" href="/">
              <span className="sr-only">Home</span>
                 {/* SVG Logo */}
            </a>

            <h2 className="mt-6 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
             Join Mock Mate AI
            </h2>

            <p className="mt-4 leading-relaxed text-white/90">
              Your AI-powered interview practice partner.
            </p>
          </div>
        </section>

        <main className="flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6">
          <div className="max-w-xl lg:max-w-3xl w-full">
            <h1 className="mt-6 text-2xl font-bold text-[#2c5f73] sm:text-3xl md:text-4xl">
              Create an Account
            </h1>

            <p className="mt-4 leading-relaxed text-[#648a98]">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-[#2c5f73] hover:underline">
                Sign In
              </Link>
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {success ? (
              <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md text-center">
                <h3 className="text-xl font-bold">Registration Successful!</h3>
                <p className="mt-2">We've sent a verification link to your email address.</p>
                <p className="mt-1">Please check your inbox and click the link to activate your account.</p>
              </div>
            ) : (
              <>
                <div className="mt-6">
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <svg className="w-5 h-5 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262">
                            <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.686H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
                            <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.27 12.214-45.257 12.214-34.543 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
                            <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.615.404C5.904 82.76 0 97.53 0 112.49c0 14.96 5.904 29.73 13.645 41.179l42.636-32.758z"></path>
                            <path fill="#EB4335" d="M130.55 50.479c19.205 0 36.344 6.698 50.073 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.645 71.717l42.636 32.758C66.43 71.312 95.944 50.479 130.55 50.479z"></path>
                        </svg>
                        Sign up with Google
                    </button>
                </div>

                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500">Or continue with email</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                   <div>
                        <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                        >
                        Full Name
                        </label>
                        <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#2c5f73] focus:border-[#2c5f73] sm:text-sm"
                        />
                    </div>
                    <div>
                        <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                        >
                        Email address
                        </label>
                        <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#2c5f73] focus:border-[#2c5f73] sm:text-sm"
                        />
                    </div>

                    <div>
                        <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                        >
                        Password
                        </label>
                        <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#2c5f73] focus:border-[#2c5f73] sm:text-sm"
                        />
                    </div>
                  

                    <div>
                        <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2c5f73] hover:bg-[#234d5f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c5f73] disabled:opacity-50"
                        >
                        {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}