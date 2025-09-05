'use client';

import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from "next/image";
import {Bot, CheckCircle, Sparkles, Target, Users, Star, Play, Mic, Brain, TrendingUp, Rocket, Award, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from "react";
import FirstTimeVisitModal from "@/components/ui/first-time-visit-modal";
import { Avatar } from "@/components/ui/avatar";

export default function Home() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const features = [
    {
      icon: <Brain size={32} className="text-white" />,
      title: "AI Interview Coach",
      description: "Your personal AI mentor that adapts to your skill level and provides real-time guidance during interviews."
    },
    {
      icon: <Target size={32} className="text-white" />,
      title: "Smart Practice Sessions",
      description: "Role-specific mock interviews with industry-standard questions and instant performance analytics."
    },
    {
      icon: <Sparkles size={32} className="text-white" />,
      title: "Interview Copilot",
      description: "Real-time suggestions, answer improvements, and confidence-building feedback as you practice."
    }
  ];

  const benefits = [
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "10x Faster Learning",
      description: "Accelerate your interview skills with AI-powered insights and targeted practice"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Industry Experts",
      description: "Access to questions and scenarios from top companies and hiring managers"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Progress Tracking",
      description: "Monitor your improvement with detailed analytics and performance metrics"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Certification Ready",
      description: "Prepare for technical certifications and advanced role interviews"
    }
  ];

  const howItWorks = [
    {
      number: "01",
      title: "Choose Your Path",
      description: "Select your target role, industry, and experience level for personalized practice",
      icon: <Target className="w-8 h-8" />
    },
    {
      number: "02",
      title: "AI-Powered Practice",
      description: "Engage in realistic interviews with our advanced AI that adapts to your responses",
      icon: <Bot className="w-8 h-8" />
    },
    {
      number: "03",
      title: "Get Instant Feedback",
      description: "Receive detailed analysis, improvement suggestions, and confidence scores",
      icon: <Sparkles className="w-8 h-8" />
    }
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Add the First Time Visit Modal */}
      <FirstTimeVisitModal />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-50 w-full py-6 px-6 md:px-12 bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                AI Mock Interview
              </h1>
              <p className="text-xs text-blue-300 font-medium">& Interview Copilot</p>
            </div>
          </Link>
          
          <div className="hidden md:flex space-x-8 items-center">
            <Link href="#features" className="text-gray-300 hover:text-white transition-colors duration-300">Features</Link>
            <Link href="#how-it-works" className="text-gray-300 hover:text-white transition-colors duration-300">How It Works</Link>
            <Link href="#testimonials" className="text-gray-300 hover:text-white transition-colors duration-300">Success Stories</Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/sign-in" passHref>
              <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20 backdrop-blur-sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" passHref>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105">
                Start Free Trial
                <Rocket className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6 md:px-12">
        <div className="container mx-auto text-center max-w-6xl">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 font-medium">AI-Powered Interview Mastery</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              Master Any Interview
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              with AI Copilot
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            Transform your interview skills with our AI-powered mock interviews and real-time coaching. 
            Practice with industry experts, get instant feedback, and land your dream job.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <Link href="/sign-up" passHref>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-xl font-semibold text-lg shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105">
                <Play className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
            </Link>
            <Link href="#demo" passHref>
              <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 px-10 py-4 rounded-xl font-semibold text-lg backdrop-blur-sm transition-all duration-300">
                <Mic className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">50K+</div>
              <div className="text-gray-400">Successful Interviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">95%</div>
              <div className="text-gray-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2">200+</div>
              <div className="text-gray-400">Job Roles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">24/7</div>
              <div className="text-gray-400">AI Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 md:px-12">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300 font-medium">Platform Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                Everything You Need
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                to Succeed
              </span>
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              From AI-powered coaching to industry-specific practice, we've built the most comprehensive 
              interview preparation platform ever created.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative p-8 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:transform hover:scale-105 h-full flex flex-col">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 flex-shrink-0">{feature.title}</h3>
                  <p className="text-gray-300 leading-relaxed flex-grow">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-24 px-6 md:px-12 bg-black/20">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300 font-medium">Why We're Different</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                Why Choose
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                AI Mock Interview?
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <div className="text-white">{benefit.icon}</div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{benefit.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 md:px-12">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
              <Rocket className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300 font-medium">Getting Started</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Get Started in
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                3 Simple Steps
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center relative group">
                {/* Connection Line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform -translate-y-1/2"></div>
                )}
                
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl shadow-blue-500/25">
                    <span className="text-2xl font-bold text-white">{step.number}</span>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <div className="text-white">{step.icon}</div>
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">{step.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-24 px-6 md:px-12 bg-black/20">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Trusted by Job Seekers
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Worldwide
              </span>
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              Join thousands of successful job seekers who transformed their careers with AI Mock Interview
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative p-6 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105">
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
                          <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
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

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6 md:px-12">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Ready to Ace Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Next Interview?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Join thousands of professionals who have already transformed their interview skills 
              and landed their dream jobs with AI Mock Interview & Interview Copilot.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link href="/sign-up" passHref>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 rounded-xl font-semibold text-lg shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105">
                  <Rocket className="w-5 h-5 mr-2" />
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#demo" passHref>
                <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 px-12 py-4 rounded-xl font-semibold text-lg backdrop-blur-sm transition-all duration-300">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Free 7-day trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full py-16 px-6 md:px-12 bg-black/40 border-t border-white/10">
        <div className="container mx-auto">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-center md:text-left">
                <p className="text-gray-400">&copy; {currentYear} AI Mock Interview & Interview Copilot. All rights reserved.</p>
                <p className="text-sm text-gray-500 mt-1">
                  Property of <span className="text-blue-300 font-medium">Edge IT Solutions LLC</span>
                </p>
              </div>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <Link href="#features" className="text-gray-400 hover:text-white transition-colors">Features</Link>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </div>
            
            <div className="text-center py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg backdrop-blur-sm">
              <p className="text-gray-300 text-sm">
                For inquiries, support, or business partnerships, contact us at:{' '}
                <span className="text-blue-300 font-medium">
                  info@edgeitek.com
                </span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}