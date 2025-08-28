// AI-Mock-Interview-/app/page.js
'use client'; // Add this if not already present, for using hooks like useState, useEffect

import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from "next/image";
import { ArrowRight, Bot, ShieldCheck, Zap, CheckCircle } from 'lucide-react';
import { useEffect, useState } from "react"; // Import useEffect and useState
import FirstTimeVisitModal from "@/components/ui/first-time-visit-modal"; // Add this import
import { Avatar } from "@/components/ui/avatar"; // Add Avatar component import

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
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Jordan M.",
      role: "Job Seeker in Tech",
      quote: "The AI-driven practice sessions helped me craft answers that really stood out. I got callbacks from companies I've been eyeing for years. This tool is a game-changer!",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Sarah Chen",
      role: "Marketing Professional",
      quote: "After using AI Mock Interview for just two weeks, I felt so much more confident in my interview skills. The personalized feedback helped me understand exactly what I needed to improve.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Marcus Johnson",
      role: "Software Engineer",
      quote: "The AI interviews are incredibly realistic. I practiced with different scenarios and got feedback that was spot-on. It's like having a professional coach available 24/7.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Priya Patel",
      role: "Healthcare Administrator",
      quote: "Switching careers was daunting, but AI Mock Interview gave me the practice I needed. The role-specific questions and feedback were invaluable for my transition.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "David Kim",
      role: "Sales Manager",
      quote: "I've been in sales for years, but interviews still made me nervous. This platform helped me refine my storytelling and presentation skills. Highly recommend!",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Emily Rodriguez",
      role: "UX Designer",
      quote: "The AI feedback on my portfolio presentation was incredibly detailed. It helped me understand how to better communicate my design process and value.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "James Wilson",
      role: "Project Manager",
      quote: "Switching from technical to management roles was challenging. AI Mock Interview helped me practice leadership scenarios and behavioral questions.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Lisa Thompson",
      role: "Data Analyst",
      quote: "The technical interview simulations were spot-on. I practiced SQL questions and case studies that actually appeared in my real interviews!",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Michael Chang",
      role: "Product Manager",
      quote: "The behavioral questions and product case studies were incredibly realistic. I felt so prepared for my final interviews!",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Rachel Green",
      role: "HR Specialist",
      quote: "As someone who conducts interviews, I wanted to see the other side. This platform gave me valuable insights into the candidate experience.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
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
        <section id="testimonials" className="py-20 bg-[#111827] relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 2px, transparent 2px)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
          <div className="container mx-auto px-6 md:px-12 relative z-10">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Trusted by Job Seekers Worldwide
              </h2>
              <p className="mt-4 text-lg text-gray-400">
                Join thousands of successful job seekers who transformed their careers with AI Mock Interview
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="p-6 bg-[#1a2234] rounded-xl shadow-lg border border-gray-700 hover:shadow-blue-500/10 transition-all duration-300 hover:border-blue-500/30">
                  <div className="flex items-start space-x-4">
                    <Avatar 
                      src={testimonial.avatar} 
                      alt={testimonial.name} 
                      name={testimonial.name}
                      size={56}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                        ))}
                      </div>
                      <p className="text-gray-300 italic text-sm leading-relaxed">"{testimonial.quote}"</p>
                      <div className="mt-3">
                        <p className="font-semibold text-white text-sm">{testimonial.name}</p>
                        <p className="text-gray-500 text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                <span className="ml-2 text-gray-500">Showing {testimonials.length} of many success stories</span>
              </div>
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