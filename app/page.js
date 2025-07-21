// AI-Mock-Interview-/app/page.js
'use client'; // Add this if not already present, for using hooks like useState, useEffect

import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from "next/image";
import { ArrowRight, Bot, ShieldCheck, Zap, CheckCircle } from 'lucide-react';
import { useEffect, useState } from "react"; // Import useEffect and useState
import FirstTimeVisitModal from "@/components/ui/first-time-visit-modal"; // Add this import

export default function Home() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // This ensures that the year is set on the client side after mounting,
    // aligning with what the client sees, thus avoiding mismatch with server render
    // if there was any discrepancy. For a static year, this complexity isn't strictly
    // needed, but it's a robust way to handle dynamic client-side values.
    setCurrentYear(new Date().getFullYear());
  }, []);

  const features = [
    {
      icon: <Bot size={32} className="text-blue-500" />,
      title: "Realistic AI Interviews",
      description: "Practice with an AI that asks relevant questions and understands your responses.",
    },
    {
      icon: <Zap size={32} className="text-green-500" />,
      title: "Instant, Actionable Feedback",
      description: "Receive immediate feedback on your answers, delivery, and body language.",
    },
    {
      icon: <ShieldCheck size={32} className="text-purple-500" />,
      title: "Build Confidence",
      description: "Our adaptive AI helps you improve your skills and build confidence for any interview.",
    },
  ];

  const testimonials = [
    {
      name: "Alex R.",
      role: "Recent College Graduate",
      quote: "AI Mock Interview was a lifeline. Their tools helped me identify key skills I needed to develop and connected me with the right opportunities. I landed my dream job within a month!",
      avatar: "/default-avatar.svg",
    },
    {
      name: "Jordan M.",
      role: "Job Seeker in Tech",
      quote: "The AI-driven practice sessions helped me craft answers that really stood out. I got callbacks from companies I've been eyeing for years. This tool is a game-changer!",
      avatar: "/default-avatar.svg",
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1526] text-gray-300">
      {/* Add the First Time Visit Modal */}
      <FirstTimeVisitModal />
      
      {/* Navigation Bar */}
      <nav className="w-full py-4 px-6 md:px-12 bg-[#111827]/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">
            AI Mock Interview
          </Link>
          <div className="hidden md:flex space-x-6 items-center">
            <Link href="#features" className="text-gray-400 hover:text-white">Features</Link>
            <Link href="#how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="#testimonials" className="text-gray-400 hover:text-white">Testimonials</Link>
          </div>
          <div className="space-x-4">
            <Link href="/sign-in" passHref>
              <Button variant="ghost" className="text-white hover:bg-gray-700">Sign In</Button>
            </Link>
            <Link href="/sign-up" passHref>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-[#0d1526]">
        <div className="grid max-w-screen-xl px-4 py-8 mx-auto lg:gap-8 xl:gap-0 lg:py-16 lg:grid-cols-12">
          <div className="mr-auto place-self-center lg:col-span-7">
            <h1 className="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none md:text-5xl xl:text-6xl text-white">
              Land Your Dream Job with AI
            </h1>
            <p className="max-w-2xl mb-6 font-light text-gray-400 lg:mb-8 md:text-lg lg:text-xl">
              Our AI-powered mock interviews help you practice, get instant
              feedback, and build the confidence you need to succeed.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-center text-white rounded-lg bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-800"
            >
                  Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2 -mr-1" />
            </Link>
          </div>
          <div className="hidden lg:mt-0 lg:col-span-5 lg:flex">
            <Image 
              src="/ai-interview-hero.png"
              alt="AI mock interview illustration"
              width={1000}
              height={720}
              className="rounded-lg"
              style={{ color: 'transparent', visibility: 'visible' }}
            />
          </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-[#111827]">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Everything You Need to Succeed
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                From realistic simulations to detailed performance analysis, we've got you covered.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col p-8 bg-[#1a2234] rounded-xl shadow-lg hover:shadow-blue-500/20 transition-shadow border border-gray-700">
                  <div className="flex-shrink-0">{feature.icon}</div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-[#0d1526]">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Get Started in 3 Simple Steps
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
                <div className="text-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-900/50 text-blue-400 mx-auto text-2xl font-bold">1</div>
                    <h3 className="mt-6 text-xl font-semibold text-white">Sign Up</h3>
                    <p className="mt-2 text-gray-400">Create your account in seconds.</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-900/50 text-blue-400 mx-auto text-2xl font-bold">2</div>
                    <h3 className="mt-6 text-xl font-semibold text-white">Start an Interview</h3>
                    <p className="mt-2 text-gray-400">Choose your job role and start a mock interview.</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-900/50 text-blue-400 mx-auto text-2xl font-bold">3</div>
                    <h3 className="mt-6 text-xl font-semibold text-white">Receive Feedback</h3>
                    <p className="mt-2 text-gray-400">Get instant, AI-powered feedback to improve.</p>
                </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 bg-[#111827]">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Trusted by Job Seekers Worldwide
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="p-8 bg-[#1a2234] rounded-xl shadow-lg border border-gray-700">
                  <p className="text-gray-400 italic">"{testimonial.quote}"</p>
                  <div className="mt-4 flex items-center">
                    <Image 
                      src={testimonial.avatar} 
                      alt={testimonial.name} 
                      width={48} 
                      height={48} 
                      className="rounded-full" 
                      style={{ color: 'transparent', visibility: 'visible' }}
                    />
                    <div className="ml-4">
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* Footer */}
      <footer className="w-full py-10 px-6 md:px-12 bg-[#111827] border-t border-gray-700">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500">&copy; {currentYear} AI Mock Interview. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#features" className="text-gray-500 hover:text-white">Features</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}