'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-green-100">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#2c5f73]">
            Forgot Your Password?
          </h1>
          <p className="text-sm text-gray-500">
            No problem! Enter your email address below and we'll send you a link to reset it.
          </p>
        </div>

        {message && (
          <div className="p-3 bg-green-100 text-green-700 rounded-md">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900">
              Your email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-[#2c5f73] focus:border-[#2c5f73]"
              placeholder="name@company.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-2.5 text-sm font-medium text-center text-white bg-[#2c5f73] rounded-lg hover:bg-[#234d5f] focus:ring-4 focus:outline-none focus:ring-primary-300 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p className="text-sm font-light text-center text-gray-500">
            Remember your password?{' '}
            <Link href="/sign-in" className="font-medium text-[#2c5f73] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
} 