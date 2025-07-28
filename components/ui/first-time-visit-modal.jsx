"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function FirstTimeVisitModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has visited before
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    
    if (!hasVisitedBefore) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Mark that user has visited
    localStorage.setItem('hasVisitedBefore', 'true');
  };

  const handleGetStarted = () => {
    // Mark that user has visited
    localStorage.setItem('hasVisitedBefore', 'true');
    setIsOpen(false);
    // Navigate to sign up will happen via Link
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 border-gray-700 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <DialogTitle className="text-xl font-bold text-white">
              Welcome to AI Mock Interview!
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-300 mt-2">
            Practice your first mock interview free and boost your confidence!
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-200">Free mock interview session</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-200">Instant AI-powered feedback</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-200">Build confidence for real interviews</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-200">No credit card required</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Link href="/sign-up" onClick={handleGetStarted}>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold">
                Start Free Mock Interview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <Link href="/sign-in" onClick={handleGetStarted}>
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
                Already have an account? Sign In
              </Button>
            </Link>
          </div>

          {/* Small print */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Join thousands of job seekers who improved their interview skills with AI Mock Interview
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 