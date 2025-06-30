// AI-Mock-Interview-/app/page.js
'use client'; // Add this if not already present, for using hooks like useState, useEffect

import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from "next/image";
import { ArrowRight, Bot, ShieldCheck, Zap, CheckCircle } from 'lucide-react';
import { useEffect, useState } from "react"; // Import useEffect and useState

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
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* Navigation Bar */}
      <nav className="w-full py-4 px-6 md:px-12 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            AI Mock Interview
          </Link>
          <div className="hidden md:flex space-x-6 items-center">
            <Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900">How It Works</Link>
            <Link href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</Link>
          </div>
          <div className="space-x-4">
            <Link href="/sign-in" passHref>
              <Button variant="ghost" className="text-gray-900 hover:bg-gray-100">Sign In</Button>
            </Link>
            <Link href="/sign-up" passHref>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="container mx-auto px-6 md:px-12 py-20 md:py-32 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 lg:w-2/5 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              Land Your Dream Job with AI
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Our AI-powered mock interviews help you practice, get instant feedback, and build the confidence you need to succeed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link href="/sign-up" passHref>
                <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 text-base font-semibold w-full sm:w-auto">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 lg:w-3/5 mt-10 md:mt-0 flex justify-center items-center">
             <Image 
                src="/webcam.png"
                alt="AI Mock Interview in action"
                width={500}
                height={400}
                className="rounded-lg shadow-xl"
             />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Everything You Need to Succeed
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                From realistic simulations to detailed performance analysis, we've got you covered.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col p-8 bg-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex-shrink-0">{feature.icon}</div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-2 text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Get Started in 3 Simple Steps
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
                <div className="text-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mx-auto text-2xl font-bold">1</div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">Sign Up</h3>
                    <p className="mt-2 text-gray-600">Create your account in seconds.</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mx-auto text-2xl font-bold">2</div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">Start an Interview</h3>
                    <p className="mt-2 text-gray-600">Choose your job role and start a mock interview.</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mx-auto text-2xl font-bold">3</div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">Receive Feedback</h3>
                    <p className="mt-2 text-gray-600">Get instant, AI-powered feedback to improve.</p>
                </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 bg-white">
          <div className="container mx-auto px-6 md:px-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Trusted by Job Seekers Worldwide
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="p-8 bg-gray-50 rounded-xl shadow-md">
                  <p className="text-gray-600 italic">"{testimonial.quote}"</p>
                  <div className="mt-4 flex items-center">
                    <Image src={testimonial.avatar} alt={testimonial.name} width={48} height={48} className="rounded-full" />
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-10 px-6 md:px-12 bg-gray-100 border-t">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500">&copy; {currentYear} AI Mock Interview. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#features" className="text-gray-500 hover:text-gray-800">Features</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-gray-800">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-800">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}